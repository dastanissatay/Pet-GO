import uuid

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.estimates.models import Decode
from app.features.users.models import User


async def get_by_device_id(session: AsyncSession, device_id: uuid.UUID) -> User | None:
    result = await session.scalars(select(User).where(User.device_id == device_id))
    return result.one_or_none()


async def create_if_missing(session: AsyncSession, device_id: uuid.UUID) -> None:
    # ON CONFLICT keeps two first requests from the same device from racing each other.
    await session.execute(
        pg_insert(User)
        .values(device_id=device_id)
        .on_conflict_do_nothing(index_elements=[User.device_id])
    )


async def count_decodes(session: AsyncSession, user_id: uuid.UUID) -> int:
    count = await session.scalar(
        select(func.count()).select_from(Decode).where(Decode.user_id == user_id)
    )
    return int(count or 0)
