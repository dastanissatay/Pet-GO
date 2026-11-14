import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import DeviceIdRequiredError
from app.core.types import Plan
from app.features.users import repository
from app.features.users.models import User

# Decodes included in the free plan (spec section 3).
FREE_DECODE_LIMIT = 1


def parse_device_id(raw: str | None) -> uuid.UUID:
    if not raw:
        raise DeviceIdRequiredError()
    try:
        return uuid.UUID(raw)
    except ValueError as exc:
        raise DeviceIdRequiredError() from exc


async def get_or_create_user(session: AsyncSession, raw_device_id: str | None) -> User:
    """Resolve the caller. This is the one place real auth replaces later."""
    device_id = parse_device_id(raw_device_id)
    user = await repository.get_by_device_id(session, device_id)
    if user is not None:
        return user

    await repository.create_if_missing(session, device_id)
    await session.commit()
    user = await repository.get_by_device_id(session, device_id)
    if user is None:  # cannot happen after the insert above; guards the type
        raise DeviceIdRequiredError()
    return user


async def free_decodes_left(session: AsyncSession, user: User) -> int:
    used = await repository.count_decodes(session, user.id)
    return max(0, FREE_DECODE_LIMIT - used)


async def set_plan(session: AsyncSession, user: User, plan: Plan) -> User:
    user.plan = plan
    await session.commit()
    return user
