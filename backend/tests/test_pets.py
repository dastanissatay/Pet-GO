from typing import Any

import httpx
import pytest

from tests.conftest import SAMPLE_DOG


def _field_errors(response: httpx.Response) -> dict[str, str]:
    fields = response.json()["error"]["details"]["fields"]
    return {item["field"]: item["message"] for item in fields}


async def test_create_and_read_current_pet(client: httpx.AsyncClient) -> None:
    created = await client.post("/api/v1/pets", json=SAMPLE_DOG)
    assert created.status_code == 201
    body = created.json()
    assert {key: body[key] for key in SAMPLE_DOG} == SAMPLE_DOG
    assert body["id"]

    current = await client.get("/api/v1/pets/current")
    assert current.status_code == 200
    assert current.json()["id"] == body["id"]


async def test_current_pet_is_the_latest(client: httpx.AsyncClient) -> None:
    await client.post("/api/v1/pets", json=SAMPLE_DOG)
    second = await client.post("/api/v1/pets", json={**SAMPLE_DOG, "name": "Mochi"})

    current = await client.get("/api/v1/pets/current")
    assert current.json()["id"] == second.json()["id"]


async def test_no_pet_yet_is_404(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/pets/current")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PET_NOT_FOUND"


async def test_cat_size_is_stored_as_null(client: httpx.AsyncClient) -> None:
    cat = {**SAMPLE_DOG, "species": "cat", "breed": "Siamese", "size_class": "large"}
    response = await client.post("/api/v1/pets", json=cat)
    assert response.status_code == 201
    assert response.json()["size_class"] is None


@pytest.mark.parametrize(
    ("change", "field", "message"),
    [
        ({"size_class": None}, "size_class", "Pick a size for your dog."),
        ({"zip": "1234"}, "zip", "Enter a 5-digit ZIP code."),
        ({"zip": "12345-6789"}, "zip", "Enter a 5-digit ZIP code."),
        ({"name": "   "}, "name", "String should have at least 1 character"),
        ({"age_years": 31}, "age_years", "Input should be less than or equal to 30"),
    ],
)
async def test_create_validation_errors_name_the_field(
    client: httpx.AsyncClient, change: dict[str, Any], field: str, message: str
) -> None:
    response = await client.post("/api/v1/pets", json={**SAMPLE_DOG, **change})
    assert response.status_code == 422
    assert _field_errors(response)[field] == message


async def test_unknown_fields_are_rejected(client: httpx.AsyncClient) -> None:
    response = await client.post("/api/v1/pets", json={**SAMPLE_DOG, "color": "gold"})
    assert response.status_code == 422


async def test_patch_updates_fields(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    response = await client.patch(f"/api/v1/pets/{pet['id']}", json={"name": "Max", "age_years": 5})
    assert response.status_code == 200
    assert response.json()["name"] == "Max"
    assert response.json()["age_years"] == 5


async def test_patch_to_cat_clears_size(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    response = await client.patch(f"/api/v1/pets/{pet['id']}", json={"species": "cat"})
    assert response.status_code == 200
    assert response.json()["size_class"] is None


@pytest.mark.parametrize(
    ("change", "field"),
    [({"size_class": None}, "size_class"), ({"name": None}, "name")],
)
async def test_patch_rejects_clearing_required_fields(
    client: httpx.AsyncClient, pet: dict[str, Any], change: dict[str, Any], field: str
) -> None:
    response = await client.patch(f"/api/v1/pets/{pet['id']}", json=change)
    assert response.status_code == 422
    assert field in _field_errors(response)


async def test_other_device_cannot_see_or_change_the_pet(
    pet: dict[str, Any], other_client: httpx.AsyncClient
) -> None:
    patch = await other_client.patch(f"/api/v1/pets/{pet['id']}", json={"name": "Stolen"})
    forecast = await other_client.get(f"/api/v1/pets/{pet['id']}/forecast")
    current = await other_client.get("/api/v1/pets/current")

    assert patch.status_code == 404
    assert patch.json()["error"]["code"] == "PET_NOT_FOUND"
    assert forecast.status_code == 404
    assert current.status_code == 404


async def test_unknown_pet_id_is_404(client: httpx.AsyncClient) -> None:
    response = await client.patch(
        "/api/v1/pets/00000000-0000-4000-8000-000000000000", json={"name": "X"}
    )
    assert response.status_code == 404
