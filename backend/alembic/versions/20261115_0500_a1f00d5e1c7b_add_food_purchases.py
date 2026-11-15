"""add food purchases

Revision ID: a1f00d5e1c7b
Revises: 6d6c33a17f80
Create Date: 2026-11-15 05:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a1f00d5e1c7b"
down_revision: str | None = "6d6c33a17f80"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "food_purchases",
        sa.Column("pet_id", sa.Uuid(), nullable=False),
        sa.Column("bought_on", sa.Date(), nullable=False),
        sa.Column("lasts_days", sa.SmallInteger(), nullable=False),
        sa.Column("expense_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "lasts_days BETWEEN 1 AND 365", name=op.f("ck_food_purchases_lasts_days_range")
        ),
        sa.ForeignKeyConstraint(
            ["expense_id"],
            ["expenses.id"],
            name=op.f("fk_food_purchases_expense_id_expenses"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["pet_id"], ["pets.id"], name=op.f("fk_food_purchases_pet_id_pets"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_food_purchases")),
    )
    op.create_index(
        op.f("ix_food_purchases_expense_id"), "food_purchases", ["expense_id"], unique=False
    )
    op.create_index(
        "ix_food_purchases_pet_id_bought_on",
        "food_purchases",
        ["pet_id", "bought_on"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_food_purchases_pet_id_bought_on", table_name="food_purchases")
    op.drop_index(op.f("ix_food_purchases_expense_id"), table_name="food_purchases")
    op.drop_table("food_purchases")
