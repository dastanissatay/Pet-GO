from typing import Literal

from pydantic import BaseModel

from app.core.types import Money


class ForecastItem(BaseModel):
    category: str
    low: int
    # National average prices at the middle visit count; always between low and high.
    typical: int
    high: int
    note: str
    source_urls: list[str]


class RegionRead(BaseModel):
    """Local price level used for vet prices. 100 is the US average."""

    name: str
    price_level: Money
    source_label: str
    source_url: str
    year: int


class ForecastRead(BaseModel):
    """Yearly cost range in whole US dollars. Every figure traces to prices.json rows,
    how often care_schedule.json says each item happens, and the ZIP's price level."""

    total_low: int
    total_typical: int
    total_high: int
    items: list[ForecastItem]
    # 12 whole-dollar amounts, January to December. Paid plans only; null on free.
    monthly: list[int] | None
    life_stage: Literal["young", "adult", "senior"]
    region: RegionRead
    schedule_basis: str
    typical_basis: str
    typical_source_url: str
