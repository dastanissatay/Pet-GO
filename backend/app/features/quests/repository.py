import uuid
from collections.abc import Iterable
from datetime import date

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.quests.models import QuestCompletion


async def completed_quest_ids(
    session: AsyncSession, pet_id: uuid.UUID, period_keys: Iterable[str]
) -> set[tuple[str, str]]:
    result = await session.execute(
        select(QuestCompletion.quest_id, QuestCompletion.period_key).where(
            QuestCompletion.pet_id == pet_id,
            QuestCompletion.period_key.in_(list(period_keys)),
        )
    )
    return {(quest_id, period_key) for quest_id, period_key in result.all()}


async def exists(session: AsyncSession, pet_id: uuid.UUID, quest_id: str, period_key: str) -> bool:
    found = await session.scalar(
        select(QuestCompletion.id).where(
            QuestCompletion.pet_id == pet_id,
            QuestCompletion.quest_id == quest_id,
            QuestCompletion.period_key == period_key,
        )
    )
    return found is not None


async def add(session: AsyncSession, completion: QuestCompletion) -> None:
    session.add(completion)
    await session.flush()


async def remove(session: AsyncSession, pet_id: uuid.UUID, quest_id: str, period_key: str) -> int:
    result = await session.execute(
        delete(QuestCompletion).where(
            QuestCompletion.pet_id == pet_id,
            QuestCompletion.quest_id == quest_id,
            QuestCompletion.period_key == period_key,
        )
    )
    return int(getattr(result, "rowcount", 0) or 0)


async def total_xp(session: AsyncSession, pet_id: uuid.UUID) -> int:
    total = await session.scalar(
        select(func.coalesce(func.sum(QuestCompletion.xp), 0)).where(
            QuestCompletion.pet_id == pet_id
        )
    )
    return int(total or 0)


async def completion_days_since(session: AsyncSession, pet_id: uuid.UUID, since: date) -> set[date]:
    result = await session.scalars(
        select(QuestCompletion.completed_on)
        .where(QuestCompletion.pet_id == pet_id, QuestCompletion.completed_on >= since)
        .distinct()
    )
    return set(result.all())
