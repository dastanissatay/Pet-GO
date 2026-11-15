import uuid

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.features.insurance import service
from app.features.insurance.schemas import InsuranceCheckRead

router = APIRouter(prefix="/pets", tags=["insurance"])


@router.get(
    "/{pet_id}/insurance-check",
    summary="Average insurance premium next to routine and unexpected costs",
    response_model=InsuranceCheckRead,
)
async def read_insurance_check(
    pet_id: uuid.UUID, user: CurrentUser, db: DbSession
) -> InsuranceCheckRead:
    return await service.get_insurance_check(db, user, pet_id)
