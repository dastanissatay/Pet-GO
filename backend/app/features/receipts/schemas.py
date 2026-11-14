from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ExpenseCategory = Literal[
    "wellness",
    "dental",
    "medication",
    "emergency",
    "food",
    "grooming",
    "other",
]


class ReceiptParseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=20_000)


class ExpenseDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    spent_on: date | None = None
    category: ExpenseCategory
    note: str = Field(min_length=1, max_length=60)
