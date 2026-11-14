import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import CheckConstraint, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Decode(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One successful estimate decode. Counted against the free plan's limit.

    The model and its migration belong to Person 2; the repository and service for
    this feature belong to Person 3.
    """

    __tablename__ = "decodes"
    __table_args__ = (CheckConstraint("total_charged >= 0", name="total_charged_not_negative"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # SET NULL keeps the decode (and the used-up free decode) if the pet is ever removed.
    pet_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("pets.id", ondelete="SET NULL"), index=True
    )
    total_charged: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    result: Mapped[dict[str, Any]] = mapped_column(JSONB)
