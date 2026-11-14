import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.core.types import Money

Category = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=40)]
Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spent_on: date
    amount: Decimal = Field(gt=0, le=Decimal("100000"), max_digits=10, decimal_places=2)
    # Use a forecast category name ("Checkups", "Dental", ...) so spending lines up
    # with the forecast, or "Other".
    category: Category
    note: Note = ""


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    spent_on: date
    amount: Money
    category: str
    note: str
    created_at: datetime


class SummaryRead(BaseModel):
    """Spending this calendar year against the forecast range, in US dollars."""

    spent_total: Money
    expected_low: int
    expected_high: int
    # Forecast range minus what is already spent, never below 0.
    still_low: Money
    still_high: Money
