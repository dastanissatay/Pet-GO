from collections.abc import AsyncIterator

import httpx
import pytest
from fastapi import FastAPI
from pydantic import BaseModel, ValidationError
from sqlalchemy.exc import OperationalError

from app.core.config import Settings
from app.core.db import Base, get_db
from app.core.errors import NotFoundError


class Body(BaseModel):
    zip: str


class BrokenSession:
    async def execute(self, *_: object) -> None:
        raise OperationalError("SELECT 1", {}, Exception("connection refused"))


async def test_health_ok_checks_database(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}
    assert response.headers["X-Request-ID"]


async def test_health_reports_database_down(app: FastAPI, client: httpx.AsyncClient) -> None:
    async def broken_db() -> AsyncIterator[BrokenSession]:
        yield BrokenSession()

    app.dependency_overrides[get_db] = broken_db

    response = await client.get("/api/health")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"


async def test_unknown_route_uses_standard_error_format(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/nope")
    assert response.status_code == 404
    error = response.json()["error"]
    assert error["code"] == "NOT_FOUND"
    assert "message" in error


async def test_domain_error_is_mapped(app: FastAPI, client: httpx.AsyncClient) -> None:
    @app.get("/boom")
    async def boom() -> None:
        raise NotFoundError("No such pet.", code="PET_NOT_FOUND", details={"id": "1"})

    response = await client.get("/boom")
    assert response.status_code == 404
    assert response.json() == {
        "error": {"code": "PET_NOT_FOUND", "message": "No such pet.", "details": {"id": "1"}}
    }


async def test_validation_error_lists_fields(app: FastAPI, client: httpx.AsyncClient) -> None:
    @app.post("/echo")
    async def echo(body: Body) -> Body:
        return body

    response = await client.post("/echo", json={})
    assert response.status_code == 422
    error = response.json()["error"]
    assert error["code"] == "VALIDATION_ERROR"
    assert error["details"]["fields"][0]["field"] == "zip"


def test_settings_fail_fast_without_database_url(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)  # type: ignore[call-arg]


def test_settings_normalize_plain_postgres_url() -> None:
    settings = Settings(database_url="postgres://u:p@host:5432/db", _env_file=None)  # type: ignore[call-arg]
    assert settings.database_url == "postgresql+asyncpg://u:p@host:5432/db"


def test_settings_blank_llm_key_counts_as_missing() -> None:
    settings = Settings(
        database_url="postgresql+asyncpg://u:p@host/db",
        llm_api_key="",
        _env_file=None,  # type: ignore[call-arg]
    )
    assert settings.llm_api_key is None


def test_metadata_has_naming_convention() -> None:
    assert Base.metadata.naming_convention["fk"].startswith("fk_")
