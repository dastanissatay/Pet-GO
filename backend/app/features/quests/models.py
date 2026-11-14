import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class QuestCompletion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One finished quest. XP, level and streak are computed from these rows."""

    __tablename__ = "quest_completions"
    __table_args__ = (
        # One completion per quest per period. Also serves lookups by pet_id.
        UniqueConstraint("pet_id", "quest_id", "period_key"),
        CheckConstraint("xp > 0", name="xp_positive"),
    )

    pet_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("pets.id", ondelete="CASCADE"))
    quest_id: Mapped[str] = mapped_column(String(64))
    # "2026-11-14" for a daily quest, "2026-W46" for a weekly one.
    period_key: Mapped[str] = mapped_column(String(10))
    # The user's local calendar day; the streak is counted from these.
    completed_on: Mapped[date] = mapped_column(Date)
    xp: Mapped[int] = mapped_column(SmallInteger)
