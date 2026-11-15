"""Read-only reference data (prices, multipliers, quests, breeds, samples).

Loaded from the JSON files in app/data, validated once at startup and kept in memory.
The content of those files belongs to Person 3; the shapes below follow their files.
Every price shown anywhere in the app must come from prices.json (spec rule 3).
"""

import json
import re
from dataclasses import dataclass
from decimal import Decimal
from functools import lru_cache
from pathlib import Path
from typing import Any, Self

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter, ValidationError, model_validator

from app.core.config import get_settings
from app.core.types import AnySpecies, Cadence, SizeClass, Species, Worry

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class ReferenceDataError(RuntimeError):
    """A reference file is missing or does not match its schema. Stops startup."""


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class PriceRow(_Strict):
    id: str = Field(min_length=1, max_length=64)
    name: str = Field(min_length=1)
    aliases: list[str] = []
    species: AnySpecies
    low: Decimal = Field(ge=0)
    high: Decimal = Field(ge=0)
    category: str = Field(min_length=1, max_length=40)
    # Routine rows make up the yearly forecast.
    routine: bool
    source_url: str = Field(pattern=r"^https?://")
    # How often the cost occurs in a year; low/high are the price of one occurrence.
    times_per_year: Decimal = Field(default=Decimal(1), gt=0, le=365)

    @model_validator(mode="after")
    def high_not_below_low(self) -> Self:
        if self.high < self.low:
            raise ValueError(f"price '{self.id}': high is below low")
        return self


class Band(_Strict):
    band: str = Field(min_length=1)
    multiplier: Decimal = Field(gt=0)
    basis: str = ""


_UNDER = re.compile(r"^under_(\d+)$")
_RANGE = re.compile(r"^(\d+)_(\d+)$")
_PLUS = re.compile(r"^(\d+)_plus$")


def age_band_range(band: str) -> tuple[int, int | None]:
    """'under_1' -> (0, 0), '1_6' -> (1, 6), '7_plus' -> (7, None). Years, inclusive."""
    if match := _UNDER.match(band):
        return 0, int(match.group(1)) - 1
    if match := _RANGE.match(band):
        return int(match.group(1)), int(match.group(2))
    if match := _PLUS.match(band):
        return int(match.group(1)), None
    raise ValueError(f"age band '{band}' must look like under_N, A_B or N_plus")


class Multipliers(_Strict):
    """Forecast factors: size (dogs only), age band per species, optional species factor."""

    size: dict[Species, list[Band]] = {}
    age: dict[Species, list[Band]]
    # Optional overall factor per species; 1 when absent.
    species: dict[Species, Decimal] = {}
    sources: list[str] = []

    @model_validator(mode="after")
    def complete_and_contiguous(self) -> Self:
        dog_sizes = {band.band for band in self.size.get("dog", [])}
        if dog_sizes != {"small", "medium", "large"}:
            raise ValueError("size.dog needs exactly the bands small, medium and large")
        for species in ("dog", "cat"):
            bands = self.age.get(species)
            if not bands:
                raise ValueError(f"age.{species} needs at least one band")
            expected_start = 0
            ranges = [age_band_range(band.band) for band in bands]
            for index, (start, end) in enumerate(ranges):
                if start != expected_start:
                    raise ValueError(f"age.{species} bands must be in order with no gaps")
                if end is None:
                    if index != len(ranges) - 1:
                        raise ValueError(f"age.{species}: only the last band may be open-ended")
                    break
                expected_start = end + 1
            else:
                raise ValueError(f"age.{species}: the last band must be open-ended (N_plus)")
        if any(value <= 0 for value in self.species.values()):
            raise ValueError("species multipliers must be above 0")
        return self

    def size_factor(self, species: Species, size_class: SizeClass | None) -> Decimal:
        if size_class is None:
            return Decimal(1)
        for band in self.size.get(species, []):
            if band.band == size_class:
                return band.multiplier
        return Decimal(1)

    def age_factor(self, species: Species, age_years: int) -> Decimal:
        bands = self.age[species]
        for band in bands:
            start, end = age_band_range(band.band)
            if age_years >= start and (end is None or age_years <= end):
                return band.multiplier
        return bands[-1].multiplier

    def species_factor(self, species: Species) -> Decimal:
        return self.species.get(species, Decimal(1))


class QuestRow(_Strict):
    id: str = Field(min_length=1, max_length=64)
    # May contain {name}; the API fills in the pet's name.
    title: str = Field(min_length=1)
    cadence: Cadence
    xp: int = Field(gt=0, le=1000)
    species: AnySpecies
    related_price_id: str | None = None
    why: str = Field(min_length=1)
    # Where the advice in `why` comes from, when it rests on a published source.
    source_url: str | None = None


class BreedsFile(_Strict):
    dog: list[str] = Field(min_length=1)
    cat: list[str] = Field(min_length=1)


class SamplePet(_Strict):
    """Same fields as PetCreate. A test checks the sample passes PetCreate validation."""

    name: str
    species: Species
    breed: str
    age_years: int
    size_class: SizeClass | None = None
    zip: str
    insured: bool
    worry: Worry


class SamplesFile(_Strict):
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


_PRICES = TypeAdapter(list[PriceRow])
_QUESTS = TypeAdapter(list[QuestRow])


def _read_json(data_dir: Path, name: str) -> Any:
    try:
        return json.loads((data_dir / name).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ReferenceDataError(f"{name} is missing or not valid JSON: {exc}") from exc


def _unique_ids(name: str, ids: list[str]) -> None:
    duplicates = sorted({item for item in ids if ids.count(item) > 1})
    if duplicates:
        raise ReferenceDataError(f"{name}: duplicate ids {duplicates}")


def load_reference_data(data_dir: Path = DATA_DIR) -> ReferenceData:
    try:
        prices = _PRICES.validate_python(_read_json(data_dir, "prices.json"))
        multipliers = Multipliers.model_validate(_read_json(data_dir, "multipliers.json"))
        quests = _QUESTS.validate_python(_read_json(data_dir, "quests.json"))
        breeds = BreedsFile.model_validate(_read_json(data_dir, "breeds.json"))
        samples = SamplesFile.model_validate(_read_json(data_dir, "samples.json"))
    except ValidationError as exc:
        raise ReferenceDataError(f"reference data is invalid: {exc}") from exc

    if not prices or not quests:
        raise ReferenceDataError("prices.json and quests.json must not be empty")
    _unique_ids("prices.json", [row.id for row in prices])
    _unique_ids("quests.json", [row.id for row in quests])

    prices_by_id = {row.id: row for row in prices}
    for quest in quests:
        if quest.related_price_id is not None and quest.related_price_id not in prices_by_id:
            raise ReferenceDataError(
                f"quests.json: quest '{quest.id}' points to unknown price "
                f"'{quest.related_price_id}'"
            )

    return ReferenceData(
        prices=tuple(prices),
        prices_by_id=prices_by_id,
        multipliers=multipliers,
        quests=tuple(quests),
        breeds=breeds,
        samples=samples,
    )


@lru_cache
def get_reference_data() -> ReferenceData:
    return load_reference_data(get_settings().reference_data_dir or DATA_DIR)
