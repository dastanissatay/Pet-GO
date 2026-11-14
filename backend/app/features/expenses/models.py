import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.core.types import EXPENSE_CATEGORIES

_CATEGORY_LIST = ", ".join(f"'{category}'" for category in EXPENSE_CATEGORIES)


class Expense(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount > 0", name="amount_positive"),
        CheckConstraint(f"category IN ({_CATEGORY_LIST})", name="category_valid"),
        # Serves the FK, the newest-first list and the per-year total.
        Index("ix_expenses_pet_id_spent_on", "pet_id", "spent_on"),
    )

    pet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pets.id", ondelete="CASCADE"))
    spent_on: Mapped[date] = mapped_column(Date)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    category: Mapped[str] = mapped_column(String(20))
    note: Mapped[str] = mapped_column(String(200), server_default="")
