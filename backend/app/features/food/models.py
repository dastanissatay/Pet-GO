import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class FoodPurchase(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A bag of food bought, and how many days the owner expects it to last."""

    __tablename__ = "food_purchases"
    __table_args__ = (
        CheckConstraint("lasts_days BETWEEN 1 AND 365", name="lasts_days_range"),
        # Serves the FK and "latest purchase for this pet".
        Index("ix_food_purchases_pet_id_bought_on", "pet_id", "bought_on"),
    )

    pet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pets.id", ondelete="CASCADE"))
    bought_on: Mapped[date] = mapped_column(Date)
    lasts_days: Mapped[int] = mapped_column(SmallInteger)
    # The matching expense when a price was given; kept if the expense is deleted.
    expense_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("expenses.id", ondelete="SET NULL"), index=True
    )
