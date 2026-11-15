import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.food.models import FoodPurchase


async def add(session: AsyncSession, purchase: FoodPurchase) -> FoodPurchase:
    session.add(purchase)
    await session.flush()
    return purchase


async def latest_for_pet(session: AsyncSession, pet_id: uuid.UUID) -> FoodPurchase | None:
    result = await session.scalars(
        select(FoodPurchase)
        .where(FoodPurchase.pet_id == pet_id)
        .order_by(FoodPurchase.bought_on.desc(), FoodPurchase.created_at.desc())
        .limit(1)
    )
    return result.first()
