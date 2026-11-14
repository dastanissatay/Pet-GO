from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession
from app.features.subscriptions.schemas import SubscriptionCreate, SubscriptionRead
from app.features.users import service as users_service

router = APIRouter(tags=["subscriptions"])


@router.post(
    "/subscriptions",
    summary="Switch plan (test mode: nothing is charged)",
    response_model=SubscriptionRead,
)
async def create_subscription(
    body: SubscriptionCreate, user: CurrentUser, db: DbSession
) -> SubscriptionRead:
    await users_service.set_plan(db, user, body.plan)
    return SubscriptionRead(plan=body.plan)
