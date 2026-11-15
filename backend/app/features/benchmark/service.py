import json
import uuid
from functools import lru_cache
from pathlib import Path
from typing import cast

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.reference_data import DATA_DIR, ReferenceDataError
from app.core.types import Species
from app.features.benchmark.schemas import BenchmarkRead
from app.features.forecast import service as forecast_service
from app.features.pets import service as pets_service
from app.features.users.models import User


class _Row(BaseModel):
    model_config = ConfigDict(extra="forbid")

    species: Species
    vet_care_average: int = Field(gt=0)


class _BenchmarkFile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    source_label: str = Field(min_length=1)
    source_url: HttpUrl
    year: int = Field(ge=2000, le=2100)
    rows: list[_Row]
    # Forecast categories the survey does not count as vet care (e.g. store-bought
    # flea and heartworm medicine), left out so the comparison is like for like.
    compare_excludes_categories: list[str] = []


def load_benchmark_file(data_dir: Path) -> _BenchmarkFile:
    path = data_dir / "benchmarks.json"
    try:
        data = _BenchmarkFile.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise ReferenceDataError(f"benchmarks.json is missing or invalid: {exc}") from exc
    if sorted(row.species for row in data.rows) != ["cat", "dog"]:
        raise ReferenceDataError("benchmarks.json needs one row for dog and one for cat")
    return data


@lru_cache
def get_benchmark_file() -> _BenchmarkFile:
    return load_benchmark_file(get_settings().reference_data_dir or DATA_DIR)


async def get_benchmark(session: AsyncSession, user: User, pet_id: uuid.UUID) -> BenchmarkRead:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    species = cast(Species, pet.species)
    forecast = await forecast_service.get_pet_forecast(session, user, pet_id)
    data = get_benchmark_file()
    row = next(r for r in data.rows if r.species == species)
    vet_items = [
        item for item in forecast.items if item.category not in data.compare_excludes_categories
    ]
    return BenchmarkRead(
        species=species,
        us_average_vet_care=row.vet_care_average,
        year=data.year,
        source_label=data.source_label,
        source_url=str(data.source_url),
        forecast_low=sum(item.low for item in vet_items),
        forecast_typical=sum(item.typical for item in vet_items),
        forecast_high=sum(item.high for item in vet_items),
        excluded_categories=[item.category for item in forecast.items if item not in vet_items],
    )
