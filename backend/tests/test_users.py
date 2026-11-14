import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.estimates.models import Decode
from app.features.users.models import User


async def test_missing_device_id_is_rejected(anon_client: httpx.AsyncClient) -> None:
    response = await anon_client.get("/api/v1/me")
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "DEVICE_ID_REQUIRED"


async def test_invalid_device_id_is_rejected(anon_client: httpx.AsyncClient) -> None:
    response = await anon_client.get("/api/v1/me", headers={"X-Device-Id": "not-a-uuid"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "DEVICE_ID_REQUIRED"


async def test_every_v1_route_needs_device_id(anon_client: httpx.AsyncClient) -> None:
    response = await anon_client.get("/api/v1/breeds", params={"species": "dog"})
    assert response.status_code == 400


async def test_me_creates_user_once(client: httpx.AsyncClient, db_session: AsyncSession) -> None:
    first = await client.get("/api/v1/me")
    second = await client.get("/api/v1/me")

    assert first.status_code == 200
    assert first.json() == {"plan": "free", "free_decodes_left": 1}
    assert second.json() == first.json()
    assert await db_session.scalar(select(func.count()).select_from(User)) == 1


async def test_free_decodes_left_counts_decodes_and_never_goes_negative(
    client: httpx.AsyncClient, db_session: AsyncSession
) -> None:
    await client.get("/api/v1/me")
    user = (await db_session.scalars(select(User))).one()

    for _ in range(2):
        db_session.add(Decode(user_id=user.id, pet_id=None, total_charged=10, result={}))
    await db_session.flush()

    response = await client.get("/api/v1/me")
    assert response.json()["free_decodes_left"] == 0
