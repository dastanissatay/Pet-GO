import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Path, Query, Response, status

from app.api.deps import CurrentUser, DbSession, UtcToday
from app.features.quests import service
from app.features.quests.schemas import (
    ProgressRead,
    QuestCompleteBody,
    QuestCompleteResult,
    QuestsRead,
)

router = APIRouter(prefix="/pets", tags=["quests"])

LocalDate = Annotated[date, Query(description="The user's local date, YYYY-MM-DD.")]
QuestId = Annotated[str, Path(max_length=64)]


@router.get(
    "/{pet_id}/quests",
    summary="Today's, this week's and this month's quests",
    response_model=QuestsRead,
)
async def list_quests(
    pet_id: uuid.UUID, local_date: LocalDate, user: CurrentUser, db: DbSession, today: UtcToday
) -> QuestsRead:
    return await service.list_quests(db, user, pet_id, local_date, today)


@router.get(
    "/{pet_id}/progress",
    summary="XP, level, avatar stage and streak",
    response_model=ProgressRead,
)
async def read_progress(
    pet_id: uuid.UUID,
    user: CurrentUser,
    db: DbSession,
    today: UtcToday,
    local_date: Annotated[
        date | None,
        Query(description="The user's local date for the streak. Defaults to today in UTC."),
    ] = None,
) -> ProgressRead:
    return await service.get_progress(db, user, pet_id, local_date or today, today)


@router.post(
    "/{pet_id}/quests/{quest_id}/complete",
    summary="Complete a quest for today, this week or this month",
    response_model=QuestCompleteResult,
)
async def complete_quest(
    pet_id: uuid.UUID,
    quest_id: QuestId,
    body: QuestCompleteBody,
    user: CurrentUser,
    db: DbSession,
    today: UtcToday,
) -> QuestCompleteResult:
    return await service.complete_quest(db, user, pet_id, quest_id, body.local_date, today)


@router.delete(
    "/{pet_id}/quests/{quest_id}/complete",
    summary="Undo a quest completion",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def undo_quest(
    pet_id: uuid.UUID,
    quest_id: QuestId,
    local_date: LocalDate,
    user: CurrentUser,
    db: DbSession,
    today: UtcToday,
) -> Response:
    await service.undo_quest(db, user, pet_id, quest_id, local_date, today)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
