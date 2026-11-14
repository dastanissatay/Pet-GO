import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.expenses.models import Expense


async def add(session: AsyncSession, expense: Expense) -> Expense:
    session.add(expense)
    await session.flush()
    return expense


async def list_page(
    session: AsyncSession, pet_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[Expense], int]:
    total = await session.scalar(
        select(func.count()).select_from(Expense).where(Expense.pet_id == pet_id)
    )
    result = await session.scalars(
        select(Expense)
        .where(Expense.pet_id == pet_id)
        .order_by(Expense.spent_on.desc(), Expense.created_at.desc(), Expense.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.all()), int(total or 0)


async def get_for_pet(
    session: AsyncSession, pet_id: uuid.UUID, expense_id: uuid.UUID
) -> Expense | None:
    result = await session.scalars(
        select(Expense).where(Expense.id == expense_id, Expense.pet_id == pet_id)
    )
    return result.one_or_none()


async def delete(session: AsyncSession, expense: Expense) -> None:
    await session.delete(expense)
    await session.flush()


async def total_between(
    session: AsyncSession, pet_id: uuid.UUID, start: date, end: date
) -> Decimal:
    total = await session.scalar(
        select(func.coalesce(func.sum(Expense.amount), 0)).where(
            Expense.pet_id == pet_id, Expense.spent_on >= start, Expense.spent_on <= end
        )
    )
    return Decimal(total or 0)
