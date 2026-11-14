import asyncio
import os
import uuid
from collections.abc import AsyncIterator
from datetime import date
from pathlib import Path
from typing import Any

# Configure the app for tests before any app module reads settings.
TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+asyncpg://petgo:petgo@localhost:5432/petgo_test"
)
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["ENV"] = "test"
os.environ["LLM_API_KEY"] = ""
os.environ["REFERENCE_DATA_DIR"] = str(Path(__file__).parent / "fixtures" / "data")

import httpx  # noqa: E402
import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.pool import NullPool  # noqa: E402

from app.api.deps import utc_today  # noqa: E402
from app.core.db import get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models_registry import Base  # noqa: E402

# Every test runs on this "server date", so nothing depends on the wall clock.
TODAY = date(2026, 11, 14)

SAMPLE_DOG: dict[str, Any] = {
    "name": "Biscuit",
    "species": "dog",
    "breed": "Golden Retriever",
    "age_years": 4,
    "size_class": "medium",
    "zip": "78704",
    "insured": False,
    "worry": "surprise",
}


async def _reset_test_database() -> None:
    url = make_url(TEST_DATABASE_URL)
    name = url.database
    if name is None or not name.endswith("_test"):
        # Guard: this fixture drops every table, so never run it on a real database.
        raise RuntimeError("TEST_DATABASE_URL must name a database ending in _test")

    admin = create_async_engine(
        url.set(database="postgres"), isolation_level="AUTOCOMMIT", poolclass=NullPool
    )
    async with admin.connect() as conn:
        exists = await conn.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"), {"name": name}
        )
        if not exists:
            await conn.execute(text(f'CREATE DATABASE "{name}"'))
    await admin.dispose()

    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


@pytest.fixture(scope="session")
def prepared_database() -> None:
    asyncio.run(_reset_test_database())


@pytest.fixture
async def db_session(prepared_database: None) -> AsyncIterator[AsyncSession]:
    """A session inside a transaction that is rolled back after the test.

    Commits made by services become savepoints, so nothing leaks between tests.
    """
    engine = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )
        try:
            yield session
        finally:
            await session.close()
            await transaction.rollback()
    await engine.dispose()


@pytest.fixture
def app(db_session: AsyncSession) -> FastAPI:
    application = create_app()

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        yield db_session

    application.dependency_overrides[get_db] = override_get_db
    application.dependency_overrides[utc_today] = lambda: TODAY
    return application


def _client(app: FastAPI, device_id: str | None) -> httpx.AsyncClient:
    headers = {"X-Device-Id": device_id} if device_id else {}
    return httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test", headers=headers
    )


@pytest.fixture
async def client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """A browser with its own device ID."""
    async with _client(app, str(uuid.uuid4())) as c:
        yield c


@pytest.fixture
async def other_client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """A second, unrelated browser."""
    async with _client(app, str(uuid.uuid4())) as c:
        yield c


@pytest.fixture
async def anon_client(app: FastAPI) -> AsyncIterator[httpx.AsyncClient]:
    """No X-Device-Id header at all."""
    async with _client(app, None) as c:
        yield c


@pytest.fixture
async def pet(client: httpx.AsyncClient) -> dict[str, Any]:
    response = await client.post("/api/v1/pets", json=SAMPLE_DOG)
    assert response.status_code == 201, response.text
    body: dict[str, Any] = response.json()
    return body
