import json
from collections import Counter
from decimal import Decimal

from app.core.llm import AnthropicJsonClient, LLMError
from app.features.estimates.matcher import match_price
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
    PriceReference,
    Species,
    Verdict,
)


class NoPricesFoundError(ValueError):
    code = "NO_PRICES_FOUND"


def verdict_for(charged: Decimal, price: PriceReference | None) -> Verdict:
    if price is None:
        return "unknown"
    if charged > price.high:
        return "above"
    if charged < price.low:
        return "below"
    return "within"


async def decode_estimate(
    *,
    text: str,
    species: Species,
    prices: list[PriceReference],
    llm: AnthropicJsonClient | None = None,
) -> DecodeResult:
    items = await _extract(text, llm)
    if not items:
        raise NoPricesFoundError("We couldn't find any priced lines in that estimate.")

    partial = [(item, match_price(item, prices, species)) for item in items]
    verdicts = [verdict_for(item.charged, price) for item, price in partial]
    explanations = await _explain(partial, verdicts, llm)

    lines: list[EstimateLine] = []
    for index, ((item, price), verdict) in enumerate(zip(partial, verdicts, strict=True)):
        explanation, question = explanations.get(index, _template_text(item, price, verdict))
        lines.append(
            EstimateLine(
                raw_text=item.raw_text,
                description=item.description,
                charged=item.charged,
                matched_id=price.id if price else None,
                range=PriceRange(low=price.low, high=price.high) if price else None,
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
    partial: list[tuple[ExtractedItem, PriceReference | None]],
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
            "range": {"low": str(price.low), "high": str(price.high)} if price else None,
            "verdict": verdict,
        }
        for index, ((item, price), verdict) in enumerate(zip(partial, verdicts, strict=True))
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
    item: ExtractedItem,
    price: PriceReference | None,
    verdict: Verdict,
) -> tuple[str, str | None]:
    if price is None:
        return (
            "We don't have a sourced reference range for this line yet.",
            "Could you explain what is included in this fee?",
        )
    relation = {"within": "within", "above": "above", "below": "below"}[verdict]
    explanation = (
        f"This charge is {relation} the ${price.low:,.0f}-${price.high:,.0f} reference range."
    )
    question = None
    if verdict == "above":
        question = "Could you explain what is included and why this price is above the reference range?"
    return explanation, question


def _summary(counts: DecodeCounts) -> str:
    reviewed = counts.within + counts.above + counts.below + counts.unknown
    return (
        f"Reviewed {reviewed} priced lines: {counts.within} within range, "
        f"{counts.above} above and {counts.unknown} with no reference range."
    )
