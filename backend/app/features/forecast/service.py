import uuid
from collections import defaultdict
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.reference_data import PriceRow, ReferenceData, get_reference_data
from app.core.types import SizeClass, Species
from app.features.forecast.care import CareRow, CareSchedule, LifeStage, get_care_schedule
from app.features.forecast.region import Region, RegionalPrices, get_regional_prices, region_for_zip
from app.features.forecast.schemas import ForecastItem, ForecastRead, RegionRead
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


def pet_factor(data: ReferenceData, species: Species, size_class: SizeClass | None) -> Decimal:
    """Species x size (dogs only) from multipliers.json.

    Age is handled by the care schedule (what happens each year at each life stage),
    so the old age-band multiplier is no longer applied on top.
    """
    multipliers = data.multipliers
    factor = multipliers.species_factor(species)
    if species == "dog":
        factor *= multipliers.size_factor(species, size_class)
    return factor


def spread_over_months(total: int) -> list[int]:
    """Split a whole-dollar yearly amount into 12 months that add up to it exactly.

    We do not know when a pet's visits will fall, so the month-by-month view spreads
    the typical yearly cost evenly: each month gets total // 12, and the dollars
    left over go to the first months, one each. It is a budgeting view (how much to
    set aside each month), not a prediction of visit dates.
    """
    base, remainder = divmod(total, 12)
    return [base + (1 if month < remainder else 0) for month in range(12)]


class _Cost:
    """Yearly low, typical and high of some price rows, before the pet and region factors."""

    def __init__(self) -> None:
        self.low = self.typical = self.high = Decimal(0)
        self.used: list[PriceRow] = []


def _row_typical(row: PriceRow, care: CareRow, species: Species) -> Decimal:
    return care.typical.get(species, (row.low + row.high) / 2)


def _yearly_cost(
    rows: list[PriceRow], schedule: CareSchedule, stage: LifeStage, species: Species
) -> _Cost:
    """Yearly cost of a category's rows; alternatives in a group count once.

    Low and high use the price range and the fewest/most visits the guidelines allow.
    Typical uses the national average price and the middle visit count. A typical price
    below the range's low (the range came from a different source) lowers the low end.
    """
    cost = _Cost()
    groups: dict[str, list[tuple[Decimal, Decimal, Decimal, PriceRow]]] = defaultdict(list)
    for row in rows:
        care = schedule.row_for(row.id)
        count_low, count_high = care.count(stage)
        per_visit = _row_typical(row, care, species)
        times = row.times_per_year
        entry = (
            min(row.low, per_visit) * times * count_low,
            per_visit * times * care.typical_count(stage),
            max(row.high, per_visit) * times * count_high,
            row,
        )
        if care.group:
            groups[care.group].append(entry)
            continue
        cost.low += entry[0]
        cost.typical += entry[1]
        cost.high += entry[2]
        if entry[2] > 0:
            cost.used.append(row)
    for members in groups.values():
        cost.low += min(member[0] for member in members)
        cost.typical += sum((member[1] for member in members), Decimal(0)) / len(members)
        cost.high += max(member[2] for member in members)
        cost.used.extend(member[3] for member in members if member[2] > 0)
    return cost


def compute_forecast(
    data: ReferenceData,
    *,
    species: Species,
    size_class: SizeClass | None,
    age_years: int,
    zip_code: str,
    include_monthly: bool,
    schedule: CareSchedule | None = None,
    regional: RegionalPrices | None = None,
) -> ForecastRead:
    """Deterministic yearly forecast. No LLM.

    For each routine price row: per-occurrence low/high x times_per_year x how many times
    care_schedule.json says it happens this year at the pet's life stage, then x the pet
    factor (species, size) x the local price level of the ZIP code.
    """
    schedule = schedule or get_care_schedule()
    region: Region = region_for_zip(regional or get_regional_prices(), zip_code)
    stage = schedule.life_stage(species, age_years)
    factor = pet_factor(data, species, size_class) * region.factor

    rows_by_category: dict[str, list[PriceRow]] = defaultdict(list)
    for row in data.prices:
        if row.routine and row.species in (species, "both"):
            rows_by_category[row.category].append(row)

    items: list[ForecastItem] = []
    for category, rows in rows_by_category.items():
        cost = _yearly_cost(rows, schedule, stage, species)
        if not cost.used:
            continue
        source_urls = list(dict.fromkeys(row.source_url for row in cost.used))
        items.append(
            ForecastItem(
                category=category,
                low=_whole_dollars(cost.low * factor),
                typical=_whole_dollars(cost.typical * factor),
                high=_whole_dollars(cost.high * factor),
                note=f"Covers {_join_names([_mid_sentence(row.name) for row in cost.used])}.",
                source_urls=source_urls,
            )
        )
    items.sort(key=lambda item: (-item.high, item.category))

    total_low = sum(item.low for item in items)
    total_typical = sum(item.typical for item in items)
    total_high = sum(item.high for item in items)
    monthly = spread_over_months(total_typical) if include_monthly else None
    return ForecastRead(
        total_low=total_low,
        total_typical=total_typical,
        total_high=total_high,
        items=items,
        monthly=monthly,
        life_stage=stage,
        region=RegionRead(
            name=region.name,
            price_level=region.price_level,
            source_label=region.source_label,
            source_url=region.source_url,
            year=region.year,
        ),
        schedule_basis=schedule.basis,
        typical_basis=schedule.typical_basis,
        typical_source_url=schedule.typical_source_url,
    )


async def get_pet_forecast(session: AsyncSession, user: User, pet_id: uuid.UUID) -> ForecastRead:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    return compute_forecast(
        get_reference_data(),
        species="cat" if pet.species == "cat" else "dog",
        size_class=_size_class(pet.size_class),
        age_years=pet.age_years,
        zip_code=pet.zip,
        include_monthly=user.plan in PAID_PLANS,
    )


_SIZE_CLASSES: dict[str, SizeClass] = {"small": "small", "medium": "medium", "large": "large"}


def _size_class(value: str | None) -> SizeClass | None:
    return _SIZE_CLASSES.get(value) if value is not None else None
