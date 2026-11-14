from dataclasses import dataclass
from datetime import UTC, date, datetime
from typing import Annotated

from fastapi import Depends, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.features.users.models import User
from app.features.users.service import get_or_create_user

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    x_device_id: Annotated[
        str | None,
        Header(description="Anonymous device ID (UUID v4) the browser generated once."),
    ] = None,
) -> User:
    """The caller. Today: an anonymous device. Later: real auth replaces only this."""
    return await get_or_create_user(db, x_device_id)


CurrentUser = Annotated[User, Depends(get_current_user)]


def utc_today() -> date:
    """Server date in UTC. A dependency so tests can pin it."""
    return datetime.now(UTC).date()


UtcToday = Annotated[date, Depends(utc_today)]


@dataclass(frozen=True)
class PageParams:
    limit: int
    offset: int


def page_params(
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> PageParams:
    return PageParams(limit=limit, offset=offset)


Pagination = Annotated[PageParams, Depends(page_params)]
