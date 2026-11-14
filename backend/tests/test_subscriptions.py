import httpx
import pytest


async def test_choose_yearly_plan(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/v1/subscriptions", json={"plan": "yearly"})
    assert response.status_code == 200
    assert response.json() == {"plan": "yearly"}

    me = await client.get("/api/v1/me")
    assert me.json()["plan"] == "yearly"


async def test_switch_to_monthly(client: httpx.AsyncClient) -> None:
    await client.post("/api/v1/subscriptions", json={"plan": "yearly"})
    response = await client.post("/api/v1/subscriptions", json={"plan": "monthly"})
    assert response.json() == {"plan": "monthly"}


@pytest.mark.parametrize(
    "body", [{"plan": "free"}, {"plan": "lifetime"}, {"plan": "yearly", "card": "x"}]
)
async def test_invalid_subscription_is_422(client: httpx.AsyncClient, body: dict[str, str]) -> None:
    response = await client.post("/api/v1/subscriptions", json=body)
    assert response.status_code == 422


async def test_plan_is_per_device(
    client: httpx.AsyncClient, other_client: httpx.AsyncClient
) -> None:
    await client.post("/api/v1/subscriptions", json={"plan": "yearly"})
    assert (await other_client.get("/api/v1/me")).json()["plan"] == "free"
