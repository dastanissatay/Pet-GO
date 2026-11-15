"""Local vet price level for a ZIP code (regional_prices.json).

The state level comes from the average dog vet visit in each state (Synchrony / CareCredit
cost study). Inside a metro area it is adjusted by how the metro's overall prices compare
with its state (BEA Regional Price Parities), so Manhattan costs more than upstate New York.
"""

import json
from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import get_settings
from app.core.reference_data import DATA_DIR, ReferenceDataError

Zip3Range = tuple[str, str]


class _State(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1)
    rpp: Decimal = Field(gt=50, lt=200)
    # Average dog vet visit in the state, in dollars.
    vet_visit: Decimal = Field(gt=0)


class _VetSource(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    us_average_visit: Decimal = Field(gt=0)
    source_label: str = Field(min_length=1)
    source_url: str = Field(pattern=r"^https?://")
    year: int = Field(ge=2000, le=2100)


class _Metro(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(min_length=1)
    rpp: Decimal = Field(gt=50, lt=200)
    zip3: list[Zip3Range] = Field(min_length=1)
    source_url: str = Field(pattern=r"^https?://")


class RegionalPrices(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    basis: str = Field(min_length=1)
    source_label: str = Field(min_length=1)
    source_url: str = Field(pattern=r"^https?://")
    year: int = Field(ge=2000, le=2100)
    vet: _VetSource
    states: dict[str, _State]
    zip3_states: list[tuple[str, str, str]]
    metros: list[_Metro]


class Region(BaseModel):
    """Where a ZIP is priced. price_level is vet prices there, with 100 the US average."""

    name: str
    price_level: Decimal
    source_label: str
    source_url: str
    year: int

    @property
    def factor(self) -> Decimal:
        return self.price_level / Decimal(100)


def _in_ranges(zip3: str, ranges: list[Zip3Range]) -> bool:
    return any(low <= zip3 <= high for low, high in ranges)


def load_regional_prices(data_dir: Path) -> RegionalPrices:
    path = data_dir / "regional_prices.json"
    try:
        data = RegionalPrices.model_validate(json.loads(path.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError, ValidationError) as exc:
        raise ReferenceDataError(f"regional_prices.json is missing or invalid: {exc}") from exc
    for low, high, state in data.zip3_states:
        if state not in data.states or not (len(low) == len(high) == 3 and low <= high):
            raise ReferenceDataError(f"regional_prices.json: bad ZIP range {low}-{high} {state}")
    return data


@lru_cache
def get_regional_prices() -> RegionalPrices:
    return load_regional_prices(get_settings().reference_data_dir or DATA_DIR)


def _state_for_zip(data: RegionalPrices, zip3: str) -> _State | None:
    for low, high, state_code in data.zip3_states:
        if low <= zip3 <= high:
            return data.states[state_code]
    return None


def region_for_zip(data: RegionalPrices, zip_code: str) -> Region:
    """State vet price level, adjusted for a metro area; the US average when not covered."""
    zip3 = zip_code[:3]
    vet = data.vet
    state = _state_for_zip(data, zip3)
    if state is None:
        return Region(
            name="US average",
            price_level=Decimal(100),
            source_label=vet.source_label,
            source_url=vet.source_url,
            year=vet.year,
        )
    level = state.vet_visit / vet.us_average_visit * 100
    for metro in data.metros:
        if _in_ranges(zip3, metro.zip3):
            return Region(
                name=metro.name,
                price_level=(level * metro.rpp / state.rpp).quantize(Decimal("0.1")),
                source_label=f"{vet.source_label}; metro adjustment: {data.source_label}",
                source_url=vet.source_url,
                year=vet.year,
            )
    return Region(
        name=state.name,
        price_level=level.quantize(Decimal("0.1")),
        source_label=vet.source_label,
        source_url=vet.source_url,
        year=vet.year,
    )
