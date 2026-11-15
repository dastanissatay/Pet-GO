import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, UnprocessableError
from app.features.expenses import repository
from app.features.expenses.models import Expense
from app.features.expenses.schemas import ExpenseCreate, ExpenseUpdate, SummaryRead
from app.features.forecast import service as forecast_service
from app.features.pets import service as pets_service
from app.features.users.models import User


async def create_expense(
    session: AsyncSession, user: User, pet_id: uuid.UUID, data: ExpenseCreate, today_utc: date
) -> Expense:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    _check_not_future(data.spent_on, today_utc)
    expense = await repository.add(
        session,
        Expense(
            pet_id=pet.id,
            spent_on=data.spent_on,
            amount=data.amount,
            category=data.category,
            note=data.note or "",
        ),
    )
    await session.commit()
    return expense


def _check_not_future(spent_on: date, today_utc: date) -> None:
    # One day of slack: the user's local date can be ahead of UTC.
    if spent_on > today_utc + timedelta(days=1):
        raise UnprocessableError(
            "Some fields are invalid.",
            code="VALIDATION_ERROR",
            details={
                "fields": [{"field": "spent_on", "message": "The date can't be in the future."}]
            },
        )


async def update_expense(
    session: AsyncSession,
    user: User,
    pet_id: uuid.UUID,
    expense_id: uuid.UUID,
    data: ExpenseUpdate,
    today_utc: date,
) -> Expense:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    expense = await repository.get_for_pet(session, pet.id, expense_id)
    if expense is None:
        raise NotFoundError("We could not find that expense.", code="EXPENSE_NOT_FOUND")
    changes = data.model_dump(exclude_unset=True)
    if data.spent_on is not None:
        _check_not_future(data.spent_on, today_utc)
        expense.spent_on = data.spent_on
    if data.amount is not None:
        expense.amount = data.amount
    if data.category is not None:
        expense.category = data.category
    if "note" in changes:
        expense.note = data.note or ""
    await session.flush()
    await session.commit()
    return expense


async def list_expenses(
    session: AsyncSession, user: User, pet_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[Expense], int]:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    return await repository.list_page(session, pet.id, limit, offset)


async def delete_expense(
    session: AsyncSession, user: User, pet_id: uuid.UUID, expense_id: uuid.UUID
) -> None:
    pet = await pets_service.get_owned_pet(session, user, pet_id)
    expense = await repository.get_for_pet(session, pet.id, expense_id)
    if expense is None:
        raise NotFoundError("We could not find that expense.", code="EXPENSE_NOT_FOUND")
    await repository.delete(session, expense)
    await session.commit()


async def get_summary(
    session: AsyncSession, user: User, pet_id: uuid.UUID, today_utc: date
) -> SummaryRead:
    """Spent this calendar year (UTC) against this year's forecast range."""
    forecast = await forecast_service.get_pet_forecast(session, user, pet_id)
    year_start = date(today_utc.year, 1, 1)
    year_end = date(today_utc.year, 12, 31)
    spent = await repository.total_between(session, pet_id, year_start, year_end)
    zero = Decimal(0)
    return SummaryRead(
        spent_total=spent,
        expected_low=forecast.total_low,
        expected_typical=forecast.total_typical,
        expected_high=forecast.total_high,
        still_low=max(zero, Decimal(forecast.total_low) - spent),
        still_typical=max(zero, Decimal(forecast.total_typical) - spent),
        still_high=max(zero, Decimal(forecast.total_high) - spent),
    )
