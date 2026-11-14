from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.api.deps import get_current_user
from app.core.config import get_settings
from app.core.db import get_engine
from app.core.errors import register_error_handlers
from app.core.logging import configure_logging, request_id_middleware
from app.core.reference_data import get_reference_data
from app.features.expenses.router import router as expenses_router
from app.features.forecast.router import router as forecast_router
from app.features.pets.router import router as pets_router
from app.features.quests.router import router as quests_router
from app.features.reference.router import router as reference_router
from app.features.subscriptions.router import router as subscriptions_router
from app.features.users.router import router as users_router


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    # Fail fast: invalid reference data stops the app before it takes traffic.
    get_reference_data()
    yield
    await get_engine().dispose()


def build_api_v1() -> APIRouter:
    """Everything under /api/v1. Every route needs the X-Device-Id header."""
    api = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_user)])
    api.include_router(users_router)
    api.include_router(reference_router)
    api.include_router(pets_router)
    api.include_router(forecast_router)
    api.include_router(quests_router)
    api.include_router(expenses_router)
    api.include_router(subscriptions_router)
    # Person 3: include the estimates and receipts routers here.
    return api


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings.debug)

    app = FastAPI(
        title="Pet&GO API",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url=None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-Device-Id", "X-Request-ID"],
    )
    app.middleware("http")(request_id_middleware)
    register_error_handlers(app)
    app.include_router(health.router)
    app.include_router(build_api_v1())
    return app


app = create_app()
