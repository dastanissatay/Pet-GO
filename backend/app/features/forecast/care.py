"""How often each routine price row happens per year, by life stage (care_schedule.json)."""

import json
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.core.config import get_settings
from app.core.reference_data import (
    DATA_DIR,
    ReferenceData,
    ReferenceDataError,
    get_reference_data,
)
from app.core.types import Species

LifeStage = Literal["young", "adult", "senior"]
# Occurrences per year, low and high. 0.33 means once every three years.
Count = tuple[Decimal, Decimal]


class CareRow(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    price_id: str = Field(min_length=1)
    young: Count
    adult: Count
    senior: Count
    why: str = Field(min_length=1)
    source_url: str = Field(pattern=r"^https?://")
    # Rows sharing a group are alternatives (spay or neuter): only one happens.
    group: str | None = None
    # National average price of one occurrence, by species. Missing: middle of the range.
    typical: dict[Species, Decimal] = {}

    @model_validator(mode="after")
    def counts_are_ranges(self) -> Self:
        for low, high in (self.young, self.adult, self.senior):
            if low < 0 or high < low or high > 12:
                raise ValueError(f"care row '{self.price_id}': counts must be 0 <= low <= high")
        return self

    def count(self, stage: LifeStage) -> Count:
        result: Count = getattr(self, stage)
        return result

    def typical_count(self, stage: LifeStage) -> Decimal:
        low, high = self.count(stage)
        return (low + high) / 2


class CareSchedule(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    basis: str = Field(min_length=1)
    typical_basis: str = Field(min_length=1)
    typical_source_url: str = Field(pattern=r"^https?://")
    senior_from_years: dict[Species, int]
    rows: list[CareRow]

    def life_stage(self, species: Species, age_years: int) -> LifeStage:
        if age_years < 1:
            return "young"
        if age_years >= self.senior_from_years[species]:
            return "senior"
        return "adult"

    def row_for(self, price_id: str) -> CareRow:
        return next(row for row in self.rows if row.price_id == price_id)

    def typical_for(self, price_id: str, species: Species) -> Decimal | None:
        """National average price of one occurrence, when the data has one."""
        row = next((row for row in self.rows if row.price_id == price_id), None)
        return row.typical.get(species) if row else None


def load_care_schedule(data_dir: Path, reference: ReferenceData) -> CareSchedule:
    path = data_dir / "care_schedule.json"
    try:
        schedule = CareSchedule.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise ReferenceDataError(f"care_schedule.json is missing or invalid: {exc}") from exc
    if set(schedule.senior_from_years) != {"dog", "cat"}:
        raise ReferenceDataError("care_schedule.json needs senior_from_years for dog and cat")
    scheduled = {row.price_id for row in schedule.rows}
    routine = {row.id for row in reference.prices if row.routine}
    if missing := sorted(routine - scheduled):
        raise ReferenceDataError(f"care_schedule.json has no row for routine prices {missing}")
    if unknown := sorted(scheduled - set(reference.prices_by_id)):
        raise ReferenceDataError(f"care_schedule.json points to unknown prices {unknown}")
    return schedule


@lru_cache
def get_care_schedule() -> CareSchedule:
    return load_care_schedule(get_settings().reference_data_dir or DATA_DIR, get_reference_data())
