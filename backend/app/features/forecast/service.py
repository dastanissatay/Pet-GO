import uuid
from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.reference_data import PriceRow, ReferenceData, get_reference_data
from app.core.types import SizeClass, Species
from app.features.forecast.schemas import ForecastItem, ForecastRead
from app.features.pets import service as pets_service
from app.features.users.models import User

PAID_PLANS = frozenset({"monthly", "yearly"})


def _whole_dollars(amount: Decimal) -> int:
    return int(amount.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def _mid_sentence(name: str) -> str:
    """'Core vaccines (DHPP)' -> 'core vaccines (DHPP)'; acronyms like 'CBC' stay."""
    if name[:2].isupper():
        return name
    return name[:1].lower() + name[1:]


# Keeps the category note to one line when a category has many rows.
MAX_NAMES_IN_NOTE = 3


def _join_names(names: list[str]) -> str:
    if len(names) > MAX_NAMES_IN_NOTE:
        shown = names[:MAX_NAMES_IN_NOTE]
        return ", ".join(shown) + f" and {len(names) - len(shown)} more"
    if len(names) <= 2:
        return " and ".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def pet_factor(
    data: ReferenceData, species: Species, size_class: SizeClass | None, age_years: int
) -> Decimal:
    """Species x size (dogs only) x age-band multiplier from multipliers.json."""
    multipliers = data.multipliers
    factor = multipliers.species_factor(species) * multipliers.age_factor(species, age_years)
    if species == "dog":
        factor *= multipliers.size_factor(species, size_class)
    return factor


def spread_over_months(total: int) -> list[int]:
    """Split a whole-dollar yearly amount into 12 months that add up to it exactly.

    We do not know when a pet's visits will fall, so the month-by-month view spreads
    the expected yearly midpoint evenly: each month gets total // 12, and the dollars
    left over go to the first months, one each. It is a budgeting view (how much to
    set aside each month), not a prediction of visit dates.
    """
    base, remainder = divmod(total, 12)
    return [base + (1 if month < remainder else 0) for month in range(12)]


def compute_forecast(
    data: ReferenceData,
    *,
    species: Species,
    size_class: SizeClass | None,
    age_years: int,
    include_monthly: bool,
) -> ForecastRead:
    """Deterministic yearly forecast. No LLM.

    Uses only routine rows from prices.json for this species. A row's yearly cost is
    its per-occurrence low/high x times_per_year x the pet factor. Rows are grouped by
    category; each category lists the source URLs of the rows it used.
    """
    factor = pet_factor(data, species, size_class, age_years)
    rows_by_category: dict[str, list[PriceRow]] = defaultdict(list)
    for row in data.prices:
        if row.routine and row.species in (species, "both"):
            rows_by_category[row.category].append(row)

    items: list[ForecastItem] = []
    for category, rows in rows_by_category.items():
        low = sum((row.low * row.times_per_year for row in rows), Decimal(0)) * factor
        high = sum((row.high * row.times_per_year for row in rows), Decimal(0)) * factor
        source_urls = list(dict.fromkeys(row.source_url for row in rows))
        items.append(
            ForecastItem(
                category=category,
                low=_whole_dollars(low),
                high=_whole_dollars(high),
                note=f"Covers {_join_names([_mid_sentence(row.name) for row in rows])}.",
                source_urls=source_urls,
            )
        )
    items.sort(key=lambda item: (-item.high, item.category))

    total_low = sum(item.low for item in items)
    total_high = sum(item.high for item in items)
    monthly = None
    if include_monthly:
        midpoint = _whole_dollars((Decimal(total_low) + Decimal(total_high)) / 2)
        monthly = spread_over_months(midpoint)
    return ForecastRead(total_low=total_low, total_high=total_high, items=items, monthly=monthly)


async def get_pet_forecast(session: AsyncSession, user: User, pet_id: uuid.UUID) -> ForecastRead:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    return compute_forecast(
        get_reference_data(),
        species="cat" if pet.species == "cat" else "dog",
        size_class=_size_class(pet.size_class),
        age_years=pet.age_years,
        include_monthly=user.plan in PAID_PLANS,
    )


_SIZE_CLASSES: dict[str, SizeClass] = {"small": "small", "medium": "medium", "large": "large"}


def _size_class(value: str | None) -> SizeClass | None:
    return _SIZE_CLASSES.get(value) if value is not None else None
