import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from app.core.types import ExpenseCategory, Money

Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
Amount = Annotated[Decimal, Field(gt=0, le=Decimal("100000"), max_digits=10, decimal_places=2)]


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    spent_on: date
    amount: Amount
    category: ExpenseCategory
    note: Note | None = None


class ExpenseUpdate(BaseModel):
    """Only the fields sent are changed. A null note clears it."""

    model_config = ConfigDict(extra="forbid")

    spent_on: date | None = None
    amount: Amount | None = None
    category: ExpenseCategory | None = None
    note: Note | None = None

    @field_validator("spent_on", "amount", "category")
    @classmethod
    def _not_null(cls, value: object) -> object:
        # Defaults are not validated, so this only rejects an explicit null.
        if value is None:
            raise ValueError("This field can't be empty.")
        return value


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    spent_on: date
    amount: Money
    category: ExpenseCategory
    note: str
    created_at: datetime


class SummaryRead(BaseModel):
    """Spending this calendar year against the forecast range, in US dollars."""

    spent_total: Money
    expected_low: int
    expected_typical: int
    expected_high: int
    # Forecast range minus what is already spent, never below 0.
    still_low: Money
    still_typical: Money
    still_high: Money
