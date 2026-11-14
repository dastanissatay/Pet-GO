import uuid

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An anonymous visitor, identified by the device ID their browser generated."""

    __tablename__ = "users"
    __table_args__ = (CheckConstraint("plan IN ('free', 'monthly', 'yearly')", name="plan_valid"),)

    device_id: Mapped[uuid.UUID] = mapped_column(unique=True)
    plan: Mapped[str] = mapped_column(String(10), server_default="free")
