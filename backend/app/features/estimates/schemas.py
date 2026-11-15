import uuid
from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.core.types import Money

Species = Literal["dog", "cat"]
Verdict = Literal["within", "above", "below", "unknown"]


class ExtractedItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    raw_text: str = Field(min_length=1, max_length=500)
    description: str = Field(min_length=1, max_length=100)
    charged: Decimal = Field(gt=0, max_digits=10, decimal_places=2)


class ExtractionResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[ExtractedItem]


class DecodeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pet_id: uuid.UUID
    text: str = Field(min_length=1, max_length=20_000)


class PriceRange(BaseModel):
    low: Decimal
    high: Decimal
    # Typical local price the range is built around. None on decodes saved before it existed.
    typical: Decimal | None = None


class ExplanationLine(BaseModel):
    model_config = ConfigDict(extra="forbid")

    index: int = Field(ge=0)
    explanation: str = Field(min_length=1, max_length=240)
    question_for_vet: str | None = Field(default=None, max_length=240)


class ExplanationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lines: list[ExplanationLine]


class EstimateLine(BaseModel):
    raw_text: str
    description: str
    charged: Decimal
    matched_id: str | None
    range: PriceRange | None
    verdict: Verdict
    explanation: str
    question_for_vet: str | None
    source_url: str | None


class DecodeCounts(BaseModel):
    within: int = 0
    above: int = 0
    below: int = 0
    unknown: int = 0


class DecodeResult(BaseModel):
    lines: list[EstimateLine]
    total_charged: Decimal
    summary: str
    counts: DecodeCounts
    # Where the typical prices were set for, e.g. "Texas". None on older saved decodes.
    area: str | None = None


class DecodeHistoryItem(BaseModel):
    """A past decode, stored as it was returned at the time."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pet_id: uuid.UUID | None
    created_at: datetime
    total_charged: Money
    result: DecodeResult
