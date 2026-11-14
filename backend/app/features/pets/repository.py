import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.pets.models import Pet


async def add(session: AsyncSession, pet: Pet) -> Pet:
    session.add(pet)
    await session.flush()
    return pet


async def get_latest_for_user(session: AsyncSession, user_id: uuid.UUID) -> Pet | None:
    result = await session.scalars(
        select(Pet)
        .where(Pet.user_id == user_id)
        .order_by(Pet.created_at.desc(), Pet.id.desc())
        .limit(1)
    )
    return result.one_or_none()


async def get_for_user(session: AsyncSession, pet_id: uuid.UUID, user_id: uuid.UUID) -> Pet | None:
    result = await session.scalars(select(Pet).where(Pet.id == pet_id, Pet.user_id == user_id))
    return result.one_or_none()
