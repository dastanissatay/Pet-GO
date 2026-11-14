import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.features.forecast import service
from app.features.forecast.schemas import ForecastRead

router = APIRouter(prefix="/pets", tags=["forecast"])


@router.get(
    "/{pet_id}/forecast",
    summary="Yearly cost forecast by category (monthly breakdown on paid plans)",
    response_model=ForecastRead,
)
async def read_forecast(pet_id: uuid.UUID, user: CurrentUser, db: DbSession) -> ForecastRead:
    return await service.get_pet_forecast(db, user, pet_id)
