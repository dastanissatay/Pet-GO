import json
import uuid
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import cast

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.reference_data import DATA_DIR, ReferenceDataError, get_reference_data
from app.core.types import Species
from app.features.forecast import service as forecast_service
from app.features.insurance.schemas import InsuranceCheckRead, UnexpectedCost
from app.features.pets import service as pets_service
from app.features.users.models import User

# How many unexpected costs to show, largest first.
MAX_UNEXPECTED_COSTS = 6
# Price categories left out of the comparison (end-of-life services).
_EXCLUDED_CATEGORIES = frozenset({"other"})


class _Premium(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species: Species
    annual: Decimal = Field(gt=0)
    monthly: Decimal = Field(gt=0)


class _InsuranceFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coverage: str = Field(min_length=1)
    source_label: str = Field(min_length=1)
    source_url: HttpUrl
    premiums: list[_Premium]


def load_insurance_file(data_dir: Path) -> _InsuranceFile:
    path = data_dir / "insurance.json"
    try:
        data = _InsuranceFile.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise ReferenceDataError(f"insurance.json is missing or invalid: {exc}") from exc
    if {row.species for row in data.premiums} != {"dog", "cat"}:
        raise ReferenceDataError("insurance.json needs one premium row for dog and one for cat")
    return data


@lru_cache
def get_insurance_file() -> _InsuranceFile:
    return load_insurance_file(get_settings().reference_data_dir or DATA_DIR)


async def get_insurance_check(
    session: AsyncSession, user: User, pet_id: uuid.UUID
) -> InsuranceCheckRead:
    """Average premium next to the pet's routine forecast and typical unexpected costs.

    Every number comes from insurance.json or prices.json. Nothing is estimated here,
    and the response makes no recommendation.
    """
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    species = cast(Species, pet.species)
    forecast = await forecast_service.get_pet_forecast(session, user, pet_id)
    data = get_insurance_file()
    premium = next(row for row in data.premiums if row.species == species)

    candidates = [
        row
        for row in get_reference_data().prices
        if not row.routine
        and row.category not in _EXCLUDED_CATEGORIES
        and row.species in (species, "both")
    ]
    candidates.sort(key=lambda row: (row.high, row.low), reverse=True)

    return InsuranceCheckRead(
        species=species,
        insured=pet.insured,
        average_annual_premium=premium.annual,
        average_monthly_premium=premium.monthly,
        premium_source_label=data.source_label,
        premium_source_url=str(data.source_url),
        routine_low=forecast.total_low,
        routine_high=forecast.total_high,
        unexpected_costs=[
            UnexpectedCost(
                price_id=row.id,
                name=row.name,
                low=int(row.low),
                high=int(row.high),
                source_url=str(row.source_url),
            )
            for row in candidates[:MAX_UNEXPECTED_COSTS]
        ],
    )
