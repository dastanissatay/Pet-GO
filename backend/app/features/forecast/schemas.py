from pydantic import BaseModel


class ForecastItem(BaseModel):
    category: str
    low: int
    high: int
    note: str
    source_urls: list[str]


class ForecastRead(BaseModel):
    """Yearly cost range in whole US dollars. Every figure traces to prices.json rows."""

    total_low: int
    total_high: int
    items: list[ForecastItem]
    # 12 whole-dollar amounts, January to December. Paid plans only; null on free.
    monthly: list[int] | None
