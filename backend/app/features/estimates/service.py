import json
import uuid
from collections import Counter
from decimal import ROUND_HALF_UP, Decimal
from typing import Protocol, cast

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import PaymentRequiredError, UnprocessableError
from app.core.llm import AnthropicJsonClient, LLMError
from app.core.reference_data import PriceRow, get_reference_data
from app.features.estimates import repository
from app.features.estimates.matcher import match_price
from app.features.estimates.models import Decode
from app.features.estimates.parser import parse_estimate_lines
from app.features.estimates.prompts import EXPLANATION_SYSTEM_PROMPT, EXTRACTION_SYSTEM_PROMPT
from app.features.estimates.schemas import (
    DecodeCounts,
    DecodeResult,
    EstimateLine,
    ExplanationResponse,
    ExtractedItem,
    ExtractionResponse,
    PriceRange,
    Species,
    Verdict,
)
from app.features.forecast.care import CareSchedule, get_care_schedule
from app.features.forecast.region import Region, get_regional_prices, region_for_zip
from app.features.pets import service as pets_service
from app.features.users.models import User
from app.features.users.service import FREE_DECODE_LIMIT


class NoPricesFoundError(UnprocessableError):
    def __init__(self) -> None:
        super().__init__(
            "We couldn't find any priced lines in that estimate.", code="NO_PRICES_FOUND"
        )


# The reference band around the typical local price. A product choice, not a sourced
# figure: wide enough for normal clinic-to-clinic differences, narrow enough to be useful.
BAND_LOW = Decimal("0.7")
BAND_HIGH = Decimal("1.3")


class _Range(Protocol):
    @property
    def low(self) -> Decimal: ...
    @property
    def high(self) -> Decimal: ...


def verdict_for(charged: Decimal, price: _Range | None) -> Verdict:
    if price is None:
        return "unknown"
    if charged > price.high:
        return "above"
    if charged < price.low:
        return "below"
    return "within"


def _dollars(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal(1), rounding=ROUND_HALF_UP)


def typical_price(price: PriceRow, species: Species, schedule: CareSchedule | None) -> Decimal:
    """National average when the data has one; otherwise the middle of the sourced range.

    The geometric middle (sqrt(low x high)) is used because these ranges are skewed:
    $400-$1,800 gives about $850, not $1,100.
    """
    national = schedule.typical_for(price.id, species) if schedule else None
    if national is not None:
        return national
    if price.low <= 0:
        return (price.low + price.high) / 2
    return (price.low * price.high).sqrt()


def local_range(
    price: PriceRow, species: Species, schedule: CareSchedule | None, region: Region | None
) -> PriceRange:
    """Typical price for the pet's area, with a band of BAND_LOW-BAND_HIGH around it."""
    factor = region.factor if region else Decimal(1)
    typical = typical_price(price, species, schedule) * factor
    return PriceRange(
        low=_dollars(typical * BAND_LOW),
        typical=_dollars(typical),
        high=_dollars(typical * BAND_HIGH),
    )


async def decode_estimate(
    *,
    text: str,
    species: Species,
    prices: list[PriceRow] | tuple[PriceRow, ...],
    llm: AnthropicJsonClient | None = None,
    schedule: CareSchedule | None = None,
    region: Region | None = None,
) -> DecodeResult:
    items = await _extract(text, llm)
    if not items:
        raise NoPricesFoundError()

    matched = [(item, match_price(item, prices, species)) for item in items]
    partial = [
        (item, price, local_range(price, species, schedule, region) if price else None)
        for item, price in matched
    ]
    verdicts = [verdict_for(item.charged, ref) for item, _, ref in partial]
    explanations = await _explain(partial, verdicts, llm)
    area = region.name if region else None

    lines: list[EstimateLine] = []
    for index, ((item, price, ref), verdict) in enumerate(zip(partial, verdicts, strict=True)):
        explanation, question = explanations.get(index, _template_text(ref, verdict, area))
        lines.append(
            EstimateLine(
                raw_text=item.raw_text,
                description=item.description,
                charged=item.charged,
                matched_id=price.id if price else None,
                range=ref,
                verdict=verdict,
                explanation=explanation,
                question_for_vet=question,
                source_url=price.source_url if price else None,
            )
        )

    counts_raw = Counter(line.verdict for line in lines)
    counts = DecodeCounts(
        within=counts_raw["within"],
        above=counts_raw["above"],
        below=counts_raw["below"],
        unknown=counts_raw["unknown"],
    )
    return DecodeResult(
        lines=lines,
        total_charged=sum((line.charged for line in lines), start=Decimal("0")),
        counts=counts,
        summary=_summary(counts),
        area=area,
    )


async def _extract(text: str, llm: AnthropicJsonClient | None) -> list[ExtractedItem]:
    if llm is not None:
        try:
            response = await llm.parse_json(
                system_prompt=EXTRACTION_SYSTEM_PROMPT,
                user_message=text,
                response_model=ExtractionResponse,
            )
            return response.items
        except LLMError:
            pass
    return parse_estimate_lines(text)


async def _explain(
    partial: list[tuple[ExtractedItem, PriceRow | None, PriceRange | None]],
    verdicts: list[Verdict],
    llm: AnthropicJsonClient | None,
) -> dict[int, tuple[str, str | None]]:
    if llm is None:
        return {}
    payload = [
        {
            "index": index,
            "description": item.description,
            "charged": str(item.charged),
            "range": {"low": str(ref.low), "high": str(ref.high)} if ref else None,
            "verdict": verdict,
        }
        for index, ((item, _, ref), verdict) in enumerate(zip(partial, verdicts, strict=True))
    ]
    try:
        response = await llm.parse_json(
            system_prompt=EXPLANATION_SYSTEM_PROMPT,
            user_message=json.dumps(payload),
            response_model=ExplanationResponse,
        )
    except LLMError:
        return {}
    return {line.index: (line.explanation, line.question_for_vet) for line in response.lines}


def _template_text(
    ref: PriceRange | None, verdict: Verdict, area: str | None
) -> tuple[str, str | None]:
    if ref is None:
        return (
            "We don't have a sourced reference range for this line yet.",
            "Could you explain what is included in this fee?",
        )
    relation = {"within": "within", "above": "above", "below": "below"}[verdict]
    where = f" in {area}" if area else ""
    explanation = (
        f"This charge is {relation} the typical ${ref.low:,.0f}-${ref.high:,.0f}{where} "
        f"(about ${ref.typical:,.0f} on average)."
    )
    question = None
    if verdict == "above":
        question = (
            "Could you explain what is included and why this price is above the reference range?"
        )
    return explanation, question


def _summary(counts: DecodeCounts) -> str:
    reviewed = counts.within + counts.above + counts.below + counts.unknown
    return (
        f"Reviewed {reviewed} priced lines: {counts.within} within range, "
        f"{counts.above} above and {counts.unknown} with no reference range."
    )


async def decode_for_user(
    session: AsyncSession,
    user: User,
    pet_id: uuid.UUID,
    text: str,
    llm: AnthropicJsonClient | None,
) -> DecodeResult:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    decode_count = await repository.count_for_user(session, user.id)
    if user.plan == "free" and decode_count >= FREE_DECODE_LIMIT:
        raise PaymentRequiredError(
            "Your free estimate decode has already been used.", code="DECODE_LIMIT_REACHED"
        )

    result = await decode_estimate(
        text=text,
        species=cast(Species, pet.species),
        prices=get_reference_data().prices,
        llm=llm,
        schedule=get_care_schedule(),
        region=region_for_zip(get_regional_prices(), pet.zip),
    )
    await repository.add(
        session,
        Decode(
            user_id=user.id,
            pet_id=pet.id,
            total_charged=result.total_charged,
            result=result.model_dump(mode="json"),
        ),
    )
    await session.commit()
    return result


async def list_decodes(
    session: AsyncSession, user: User, limit: int, offset: int
) -> tuple[list[Decode], int]:
    return await repository.list_for_user(session, user.id, limit, offset)
