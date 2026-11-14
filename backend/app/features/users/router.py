from typing import cast

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.core.types import Plan
from app.features.users import service
from app.features.users.schemas import MeRead

router = APIRouter(tags=["users"])


@router.get("/me", summary="Current plan and free decodes left", response_model=MeRead)
async def read_me(user: CurrentUser, db: DbSession) -> MeRead:
    left = await service.free_decodes_left(db, user)
    return MeRead(plan=cast(Plan, user.plan), free_decodes_left=left)
