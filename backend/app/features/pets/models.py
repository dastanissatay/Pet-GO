import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, SmallInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Pet(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "pets"
    __table_args__ = (
        CheckConstraint("species IN ('dog', 'cat')", name="species_valid"),
        CheckConstraint(
            "(species = 'cat' AND size_class IS NULL) OR "
            "(species = 'dog' AND size_class IN ('small', 'medium', 'large'))",
            name="size_class_matches_species",
        ),
        CheckConstraint("age_years BETWEEN 0 AND 30", name="age_years_range"),
        CheckConstraint("zip ~ '^[0-9]{5}$'", name="zip_five_digits"),
        CheckConstraint("worry IN ('surprise', 'monthly', 'normal')", name="worry_valid"),
        CheckConstraint("char_length(name) > 0", name="name_not_empty"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(40))
    species: Mapped[str] = mapped_column(String(3))
    breed: Mapped[str] = mapped_column(String(80))
    age_years: Mapped[int] = mapped_column(SmallInteger)
    size_class: Mapped[str | None] = mapped_column(String(6))
    zip: Mapped[str] = mapped_column(String(5))
    insured: Mapped[bool] = mapped_column(Boolean)
    worry: Mapped[str] = mapped_column(String(10))
