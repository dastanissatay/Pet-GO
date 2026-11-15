import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.api.deps import CurrentUser, DbSession, UtcToday
from app.features.food import service
from app.features.food.schemas import (
    FoodPlanRead,
    FoodPurchaseCreate,
    FoodPurchaseRead,
    FoodStatusRead,
)

router = APIRouter(prefix="/pets", tags=["food"])

LocalDate = Annotated[date, Query(description="The user's local date, YYYY-MM-DD.")]


@router.get(
    "/{pet_id}/food",
    summary="Food type for the pet's size and age, its yearly cost and where to buy it",
    response_model=FoodPlanRead,
)
async def read_food_plan(pet_id: uuid.UUID, user: CurrentUser, db: DbSession) -> FoodPlanRead:
    return await service.get_food_plan(db, user, pet_id)


@router.post(
    "/{pet_id}/food/purchases",
    summary="Log a bag of food; with a price it is also saved as an expense",
    response_model=FoodPurchaseRead,
    status_code=status.HTTP_201_CREATED,
)
async def add_food_purchase(
    pet_id: uuid.UUID,
    body: FoodPurchaseCreate,
    user: CurrentUser,
    db: DbSession,
    today: UtcToday,
) -> FoodPurchaseRead:
    purchase = await service.add_purchase(db, user, pet_id, body, today)
    return FoodPurchaseRead.model_validate(purchase)


@router.get(
    "/{pet_id}/food/status",
    summary="When the current bag runs out and when to buy the next one",
    response_model=FoodStatusRead,
)
async def read_food_status(
    pet_id: uuid.UUID, local_date: LocalDate, user: CurrentUser, db: DbSession, today: UtcToday
) -> FoodStatusRead:
    return await service.get_food_status(db, user, pet_id, local_date, today)
