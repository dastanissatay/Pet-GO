"""Read-only reference data (prices, multipliers, quests, breeds, samples).

Loaded from the JSON files in app/data, validated once at startup and kept in memory.
The content of those files belongs to Person 3; the shapes below are the contract.
Every price shown anywhere in the app must come from prices.json (spec rule 3).
"""

import json
import logging
from dataclasses import dataclass
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Self

from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator

from app.core.config import get_settings
from app.core.types import AnySpecies, Cadence, SizeClass, Species, Worry

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class ReferenceDataError(RuntimeError):
    """A reference file is missing or does not match its schema. Stops startup."""


class _Row(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class _File(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, populate_by_name=True)

    # True marks stand-in content that must be replaced before launch.
    placeholder: bool = Field(default=False, alias="_placeholder")
    # Free-text note for whoever edits the file. Ignored by the app.
    note: str | None = Field(default=None, alias="_note")


class PriceRow(_Row):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1)
    aliases: list[str] = []
    species: AnySpecies
    low: Decimal = Field(ge=0)
    high: Decimal = Field(ge=0)
    category: str = Field(min_length=1, max_length=40)
    routine: bool
    source_url: str = Field(pattern=r"^https?://")
    # How often a routine cost happens in a year (12 for a monthly preventive).
    # low/high are always the price of one occurrence.
    times_per_year: Decimal = Field(default=Decimal(1), gt=0, le=365)

    @model_validator(mode="after")
    def high_not_below_low(self) -> Self:
        if self.high < self.low:
            raise ValueError(f"price '{self.id}': high is below low")
        return self


class PricesFile(_File):
    items: list[PriceRow] = Field(min_length=1)

    @model_validator(mode="after")
    def ids_unique(self) -> Self:
        ids = [row.id for row in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("price ids must be unique")
        return self


class AgeBand(_Row):
    # Upper bound in years, inclusive. null on the last band means "and older".
    max_age_years: int | None = Field(ge=0)
    multiplier: Decimal = Field(gt=0)


class Multipliers(_File):
    species: dict[Species, Decimal]
    size: dict[SizeClass, Decimal]
    age_bands: list[AgeBand] = Field(min_length=1)

    @model_validator(mode="after")
    def complete_and_ordered(self) -> Self:
        if set(self.species) != {"dog", "cat"}:
            raise ValueError("species multipliers need both dog and cat")
        if set(self.size) != {"small", "medium", "large"}:
            raise ValueError("size multipliers need small, medium and large")
        if any(value <= 0 for value in (*self.species.values(), *self.size.values())):
            raise ValueError("multipliers must be above 0")
        bounds = [band.max_age_years for band in self.age_bands]
        if bounds[-1] is not None or None in bounds[:-1]:
            raise ValueError("only the last age band may have max_age_years null")
        finite = [bound for bound in bounds if bound is not None]
        if finite != sorted(set(finite)):
            raise ValueError("age bands must be in ascending order")
        return self

    def for_age(self, age_years: int) -> Decimal:
        for band in self.age_bands:
            if band.max_age_years is None or age_years <= band.max_age_years:
                return band.multiplier
        return self.age_bands[-1].multiplier


class QuestRow(_Row):
    id: str = Field(min_length=1, max_length=64)
    title: str = Field(min_length=1)
    cadence: Cadence
    xp: int = Field(gt=0, le=1000)
    species: AnySpecies
    related_price_id: str | None = None
    why: str = Field(min_length=1)


class QuestsFile(_File):
    items: list[QuestRow] = Field(min_length=1)

    @model_validator(mode="after")
    def ids_unique(self) -> Self:
        ids = [row.id for row in self.items]
        if len(ids) != len(set(ids)):
            raise ValueError("quest ids must be unique")
        return self


class BreedsFile(_File):
    dog: list[str] = Field(min_length=1)
    cat: list[str] = Field(min_length=1)


class SamplePet(_Row):
    """Same fields as PetCreate. A test checks the sample passes PetCreate validation."""

    name: str
    species: Species
    breed: str
    age_years: int
    size_class: SizeClass | None = None
    zip: str
    insured: bool
    worry: Worry


class SamplesFile(_File):
    pet: SamplePet
    estimate_text: str = Field(min_length=1)
    receipt_text: str = Field(min_length=1)


@dataclass(frozen=True)
class ReferenceData:
    prices: tuple[PriceRow, ...]
    prices_by_id: dict[str, PriceRow]
    multipliers: Multipliers
    quests: tuple[QuestRow, ...]
    breeds: BreedsFile
    samples: SamplesFile
    is_placeholder: bool


def _read[T: _File](data_dir: Path, name: str, model: type[T]) -> T:
    try:
        raw = json.loads((data_dir / name).read_text(encoding="utf-8"))
        return model.model_validate(raw)
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise ReferenceDataError(f"{name} is missing or invalid: {exc}") from exc


def load_reference_data(data_dir: Path = DATA_DIR) -> ReferenceData:
    prices = _read(data_dir, "prices.json", PricesFile)
    multipliers = _read(data_dir, "multipliers.json", Multipliers)
    quests = _read(data_dir, "quests.json", QuestsFile)
    breeds = _read(data_dir, "breeds.json", BreedsFile)
    samples = _read(data_dir, "samples.json", SamplesFile)

    prices_by_id = {row.id: row for row in prices.items}
    for quest in quests.items:
        if quest.related_price_id is not None and quest.related_price_id not in prices_by_id:
            raise ReferenceDataError(
                f"quests.json: quest '{quest.id}' points to unknown price "
                f"'{quest.related_price_id}'"
            )

    return ReferenceData(
        prices=tuple(prices.items),
        prices_by_id=prices_by_id,
        multipliers=multipliers,
        quests=tuple(quests.items),
        breeds=breeds,
        samples=samples,
        is_placeholder=any(f.placeholder for f in (prices, multipliers, quests, breeds, samples)),
    )


@lru_cache
def get_reference_data() -> ReferenceData:
    data = load_reference_data(get_settings().reference_data_dir or DATA_DIR)
    if data.is_placeholder:
        logger.warning("Reference data contains placeholder files. Replace them before launch.")
    return data
