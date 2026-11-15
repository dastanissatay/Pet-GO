from typing import Any

import httpx

from tests.conftest import TODAY


async def test_decode_history_lists_newest_first(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    empty = await client.get("/api/v1/estimates")
    assert empty.status_code == 200
    assert empty.json() == {"items": [], "total": 0}

    decoded = await client.post(
        "/api/v1/estimates/decode",
        json={"pet_id": pet["id"], "text": "Wellness exam $72.00\nBiohazard fee $18.00"},
    )
    assert decoded.status_code == 200, decoded.text

    history = await client.get("/api/v1/estimates")
    body = history.json()
    assert body["total"] == 1
    item = body["items"][0]
    assert item["result"]["total_charged"] == decoded.json()["total_charged"]
    assert [line["verdict"] for line in item["result"]["lines"]] == ["within", "unknown"]


async def test_decode_history_is_private(
    client: httpx.AsyncClient, other_client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    await client.post(
        "/api/v1/estimates/decode",
        json={"pet_id": pet["id"], "text": "Wellness exam $72.00"},
    )
    other = await other_client.get("/api/v1/estimates")
    assert other.json()["total"] == 0


async def test_update_expense(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    url = f"/api/v1/pets/{pet['id']}/expenses"
    created = await client.post(
        url,
        json={"spent_on": TODAY.isoformat(), "amount": "40.00", "category": "wellness"},
    )
    expense_id = created.json()["id"]

    updated = await client.patch(f"{url}/{expense_id}", json={"amount": "55.50", "note": "Exam"})
    assert updated.status_code == 200, updated.text
    assert updated.json()["amount"] == 55.5
    assert updated.json()["note"] == "Exam"
    assert updated.json()["category"] == "wellness"

    summary = await client.get(f"/api/v1/pets/{pet['id']}/summary")
    assert summary.json()["spent_total"] == 55.5


async def test_update_expense_rejects_empty_amount_and_future_date(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    url = f"/api/v1/pets/{pet['id']}/expenses"
    created = await client.post(
        url,
        json={"spent_on": TODAY.isoformat(), "amount": "40.00", "category": "wellness"},
    )
    expense_url = f"{url}/{created.json()['id']}"

    empty = await client.patch(expense_url, json={"amount": None})
    assert empty.status_code == 422
    future = await client.patch(expense_url, json={"spent_on": "2099-01-01"})
    assert future.status_code == 422
    fields = [item["field"] for item in future.json()["error"]["details"]["fields"]]
    assert "spent_on" in fields


async def test_update_other_users_expense_is_not_found(
    client: httpx.AsyncClient, other_client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    created = await client.post(
        f"/api/v1/pets/{pet['id']}/expenses",
        json={"spent_on": TODAY.isoformat(), "amount": "40.00", "category": "wellness"},
    )
    response = await other_client.patch(
        f"/api/v1/pets/{pet['id']}/expenses/{created.json()['id']}", json={"amount": "1.00"}
    )
    assert response.status_code == 404


async def test_insurance_check_uses_sourced_numbers(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await client.get(f"/api/v1/pets/{pet['id']}/insurance-check")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["species"] == "dog"
    assert body["average_annual_premium"] == 749.29
    assert body["premium_source_url"].startswith("https://")

    forecast = (await client.get(f"/api/v1/pets/{pet['id']}/forecast")).json()
    assert body["routine_low"] == forecast["total_low"]
    assert body["routine_high"] == forecast["total_high"]
    assert body["unexpected_costs"], "non-routine price rows should be listed"
    assert all(cost["source_url"].startswith("https://") for cost in body["unexpected_costs"])


async def test_insurance_check_other_users_pet_is_not_found(
    other_client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await other_client.get(f"/api/v1/pets/{pet['id']}/insurance-check")
    assert response.status_code == 404
