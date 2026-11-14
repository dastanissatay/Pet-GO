from datetime import timedelta
from typing import Any

import httpx
import pytest

from tests.conftest import TODAY


def _expense(**overrides: Any) -> dict[str, Any]:
    return {
        "spent_on": TODAY.isoformat(),
        "amount": "42.50",
        "category": "wellness",
        "note": "Wellness exam",
        **overrides,
    }


def _url(pet: dict[str, Any], suffix: str = "expenses") -> str:
    return f"/api/v1/pets/{pet['id']}/{suffix}"


async def test_create_and_list_expenses(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    created = await client.post(_url(pet), json=_expense())
    assert created.status_code == 201
    assert created.json()["amount"] == 42.5

    older = (TODAY - timedelta(days=3)).isoformat()
    await client.post(_url(pet), json=_expense(spent_on=older, amount=10))

    listed = await client.get(_url(pet))
    body = listed.json()
    assert body["total"] == 2
    assert [item["spent_on"] for item in body["items"]] == [TODAY.isoformat(), older]


async def test_null_note_is_stored_as_empty(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    response = await client.post(_url(pet), json=_expense(note=None))
    assert response.status_code == 201
    assert response.json()["note"] == ""


async def test_list_is_paginated(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    for amount in (1, 2, 3):
        await client.post(_url(pet), json=_expense(amount=amount))

    page = await client.get(_url(pet), params={"limit": 2, "offset": 2})
    assert page.json()["total"] == 3
    assert len(page.json()["items"]) == 1


@pytest.mark.parametrize(
    ("change", "field"),
    [
        ({"amount": 0}, "amount"),
        ({"amount": -5}, "amount"),
        ({"amount": "1.005"}, "amount"),
        ({"category": "Checkups"}, "category"),
        ({"spent_on": "11/14/2026"}, "spent_on"),
    ],
)
async def test_invalid_expense_is_422(
    client: httpx.AsyncClient, pet: dict[str, Any], change: dict[str, Any], field: str
) -> None:
    response = await client.post(_url(pet), json=_expense(**change))
    assert response.status_code == 422
    fields = [item["field"] for item in response.json()["error"]["details"]["fields"]]
    assert field in fields


async def test_future_date_is_rejected(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    tomorrow = await client.post(
        _url(pet), json=_expense(spent_on=(TODAY + timedelta(days=1)).isoformat())
    )
    later = await client.post(
        _url(pet), json=_expense(spent_on=(TODAY + timedelta(days=2)).isoformat())
    )
    assert tomorrow.status_code == 201  # local time zones can be a day ahead
    assert later.status_code == 422


async def test_delete_expense(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    expense = (await client.post(_url(pet), json=_expense())).json()

    deleted = await client.delete(_url(pet, f"expenses/{expense['id']}"))
    assert deleted.status_code == 204
    assert (await client.get(_url(pet))).json()["total"] == 0

    again = await client.delete(_url(pet, f"expenses/{expense['id']}"))
    assert again.status_code == 404
    assert again.json()["error"]["code"] == "EXPENSE_NOT_FOUND"


async def test_other_device_cannot_touch_expenses(
    client: httpx.AsyncClient, pet: dict[str, Any], other_client: httpx.AsyncClient
) -> None:
    expense = (await client.post(_url(pet), json=_expense())).json()

    listing = await other_client.get(_url(pet))
    deleting = await other_client.delete(_url(pet, f"expenses/{expense['id']}"))
    assert listing.status_code == 404
    assert deleting.status_code == 404


async def test_summary_without_expenses(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    response = await client.get(_url(pet, "summary"))
    assert response.json() == {
        "spent_total": 0,
        "expected_low": 570,
        "expected_high": 1140,
        "still_low": 570,
        "still_high": 1140,
    }


async def test_summary_floors_at_zero_and_ignores_last_year(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    await client.post(_url(pet), json=_expense(amount="600.25"))
    await client.post(_url(pet), json=_expense(spent_on="2025-12-31", amount=999))

    response = await client.get(_url(pet, "summary"))
    assert response.json() == {
        "spent_total": 600.25,
        "expected_low": 570,
        "expected_high": 1140,
        "still_low": 0,
        "still_high": 539.75,
    }
