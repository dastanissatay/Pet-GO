import logging

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.api.deps import DbSession
from app.core.errors import ServiceUnavailableError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["health"])


class HealthRead(BaseModel):
    status: str
    database: str


@router.get("/health", summary="Service health check", response_model=HealthRead)
async def health(db: DbSession) -> HealthRead:
    try:
        await db.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError) as exc:
        logger.error("Health check could not reach the database: %s", type(exc).__name__)
        raise ServiceUnavailableError(
            "The database is not reachable.", code="DATABASE_UNAVAILABLE"
        ) from exc
    return HealthRead(status="ok", database="ok")
