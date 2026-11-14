from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core.llm import get_llm_client
from app.features.estimates import service
from app.features.estimates.schemas import DecodeRequest, DecodeResult

router = APIRouter(prefix="/estimates", tags=["estimates"])


@router.post(
    "/decode",
    summary="Decode a veterinary estimate",
    response_model=DecodeResult,
)
async def decode_estimate(body: DecodeRequest, user: CurrentUser, db: DbSession) -> DecodeResult:
    return await service.decode_for_user(
        db,
        user,
        body.pet_id,
        body.text,
        get_llm_client(),
    )
