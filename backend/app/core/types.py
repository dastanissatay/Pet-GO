from decimal import Decimal
from typing import Annotated, Literal, get_args

from pydantic import PlainSerializer

Species = Literal["dog", "cat"]
AnySpecies = Literal["dog", "cat", "both"]
SizeClass = Literal["small", "medium", "large"]
Worry = Literal["surprise", "monthly", "normal"]
Plan = Literal["free", "monthly", "yearly"]
PaidPlan = Literal["monthly", "yearly"]
Cadence = Literal["daily", "weekly", "monthly"]
# Shared with the frontend (src/features/expenses/categories.ts) and the DB check.
ExpenseCategory = Literal[
    "wellness", "dental", "medication", "emergency", "food", "grooming", "other"
]
EXPENSE_CATEGORIES: tuple[str, ...] = get_args(ExpenseCategory)

# Money is Decimal everywhere in Python and Numeric in the database. In JSON responses it
# goes out as a number, so the frontend does not have to parse strings.
Money = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]
