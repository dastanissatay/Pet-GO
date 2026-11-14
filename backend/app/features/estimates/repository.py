import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.estimates.models import Decode


async def count_for_user(session: AsyncSession, user_id: uuid.UUID) -> int:
    count = await session.scalar(
        select(func.count()).select_from(Decode).where(Decode.user_id == user_id)
    )
    return int(count or 0)


async def add(session: AsyncSession, decode: Decode) -> Decode:
    session.add(decode)
    await session.flush()
    return decode
