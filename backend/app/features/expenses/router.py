import uuid

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, DbSession, Pagination, UtcToday
from app.core.schemas import Page
from app.features.expenses import service
from app.features.expenses.schemas import ExpenseCreate, ExpenseRead, ExpenseUpdate, SummaryRead

router = APIRouter(prefix="/pets", tags=["expenses"])


@router.get(
    "/{pet_id}/expenses",
    summary="List expenses, newest first",
    response_model=Page[ExpenseRead],
)
async def list_expenses(
    pet_id: uuid.UUID, page: Pagination, user: CurrentUser, db: DbSession
) -> Page[ExpenseRead]:
    items, total = await service.list_expenses(db, user, pet_id, page.limit, page.offset)
    return Page[ExpenseRead](
        items=[ExpenseRead.model_validate(item) for item in items], total=total
    )


@router.post(
    "/{pet_id}/expenses",
    summary="Add an expense",
    response_model=ExpenseRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_expense(
    pet_id: uuid.UUID, body: ExpenseCreate, user: CurrentUser, db: DbSession, today: UtcToday
) -> ExpenseRead:
    expense = await service.create_expense(db, user, pet_id, body, today)
    return ExpenseRead.model_validate(expense)


@router.patch(
    "/{pet_id}/expenses/{expense_id}",
    summary="Change an expense",
    response_model=ExpenseRead,
)
async def update_expense(
    pet_id: uuid.UUID,
    expense_id: uuid.UUID,
    body: ExpenseUpdate,
    user: CurrentUser,
    db: DbSession,
    today: UtcToday,
) -> ExpenseRead:
    expense = await service.update_expense(db, user, pet_id, expense_id, body, today)
    return ExpenseRead.model_validate(expense)


@router.delete(
    "/{pet_id}/expenses/{expense_id}",
    summary="Delete an expense",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_expense(
    pet_id: uuid.UUID, expense_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> Response:
    await service.delete_expense(db, user, pet_id, expense_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{pet_id}/summary",
    summary="Spent this year against the forecast range",
    response_model=SummaryRead,
)
async def read_summary(
    pet_id: uuid.UUID, user: CurrentUser, db: DbSession, today: UtcToday
) -> SummaryRead:
    return await service.get_summary(db, user, pet_id, today)
