from pydantic import BaseModel

from app.core.types import Species


class BenchmarkRead(BaseModel):
    """The pet's vet-care forecast next to what the average US owner spent."""

    species: Species
    us_average_vet_care: int
    year: int
    source_label: str
    source_url: str
    # The pet's forecast without the excluded categories, so it matches "vet care".
    forecast_low: int
    forecast_typical: int
    forecast_high: int
    excluded_categories: list[str]
