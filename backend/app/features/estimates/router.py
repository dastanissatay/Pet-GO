from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, Pagination
from app.core.llm import get_llm_client
from app.core.schemas import Page
from app.features.estimates import service
from app.features.estimates.schemas import DecodeHistoryItem, DecodeRequest, DecodeResult

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


@router.get(
    "",
    summary="List past decodes, newest first",
    response_model=Page[DecodeHistoryItem],
)
async def list_decodes(
    page: Pagination, user: CurrentUser, db: DbSession
) -> Page[DecodeHistoryItem]:
    items, total = await service.list_decodes(db, user, page.limit, page.offset)
    return Page[DecodeHistoryItem](
        items=[DecodeHistoryItem.model_validate(item) for item in items], total=total
    )
