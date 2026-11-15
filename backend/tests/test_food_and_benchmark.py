from datetime import timedelta
from typing import Any

import httpx
import pytest

from app.features.food.service import BUY_AHEAD_DAYS, food_status, food_type, life_stage, shop_links
from tests.conftest import SAMPLE_DOG, TODAY


@pytest.mark.parametrize(
    ("species", "age", "stage"),
    [
        ("dog", 0, "young"),
        ("dog", 6, "adult"),
        ("dog", 7, "senior"),
        ("cat", 10, "adult"),
        ("cat", 11, "senior"),
    ],
)
def test_life_stage(species: Any, age: int, stage: str) -> None:
    assert life_stage(species, age) == stage


def test_food_type_names() -> None:
    assert food_type("dog", "large", "senior") == "Large breed senior dry dog food"
    assert food_type("dog", "small", "young") == "Small breed puppy dry food"
    assert food_type("cat", None, "young") == "Kitten dry food"
    assert food_type("cat", None, "senior") == "Senior dry cat food"


def test_shop_links_are_store_searches() -> None:
    links = shop_links("Large breed senior dry dog food")
    assert [link.store for link in links] == ["Walmart", "Amazon"]
    assert links[0].url == "https://www.walmart.com/search?q=large+breed+senior+dry+dog+food"
    assert links[1].url == "https://www.amazon.com/s?k=large+breed+senior+dry+dog+food"


async def test_food_plan_for_the_pet(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    response = await client.get(f"/api/v1/pets/{pet['id']}/food")
    assert response.status_code == 200
    body = response.json()
    size = SAMPLE_DOG["size_class"]
    assert body["species"] == "dog"
    assert body["food_type"].startswith(f"{size.capitalize()} breed")
    # Golden Retriever 55-75 lb (AKC), adult factor 1.4-1.8, 3,500-4,000 kcal/kg, $1.92-$3.40/lb.
    assert body["weight_basis"] == "Golden Retriever, 55-75 lb"
    assert (body["daily_kcal_low"], body["daily_kcal_high"]) == (1094, 1775)
    assert (body["annual_low"], body["annual_typical"], body["annual_high"]) == (423, 809, 1387)
    assert [source["url"].split("/")[2] for source in body["sources"]] == [
        "www.akc.org",
        "petnutritionalliance.org",
        "academy.royalcanin.com",
        "www.rover.com",
    ]
    assert len(body["shop_links"]) == 2


async def test_food_plan_follows_pet_edits(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    await client.patch(f"/api/v1/pets/{pet['id']}", json={"size_class": "large", "age_years": 9})
    body = (await client.get(f"/api/v1/pets/{pet['id']}/food")).json()
    assert body["food_type"] == "Large breed senior dry dog food"
    # Seniors need fewer calories: factor 1.2-1.4 instead of 1.4-1.8.
    assert (body["annual_low"], body["annual_typical"], body["annual_high"]) == (362, 657, 1079)


async def test_unlisted_breed_uses_the_size_class(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    await client.patch(
        f"/api/v1/pets/{pet['id']}", json={"breed": "Mixed / not sure", "size_class": "small"}
    )
    body = (await client.get(f"/api/v1/pets/{pet['id']}/food")).json()
    assert body["weight_basis"] == "small dog, 10-20 lb"


async def test_benchmark_compares_forecast_with_us_average(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await client.get(f"/api/v1/pets/{pet['id']}/benchmark")
    assert response.status_code == 200
    body = response.json()
    forecast = (await client.get(f"/api/v1/pets/{pet['id']}/forecast")).json()
    assert body["us_average_vet_care"] == 598
    assert body["year"] == 2025
    assert body["source_url"].startswith("https://www.avma.org/")
    # Store-bought parasite prevention is not "vet care" in the survey, so it is left out.
    vet_items = [i for i in forecast["items"] if i["category"] != "Parasite prevention"]
    assert body["excluded_categories"] == ["Parasite prevention"]
    assert (body["forecast_low"], body["forecast_typical"], body["forecast_high"]) == (
        sum(i["low"] for i in vet_items),
        sum(i["typical"] for i in vet_items),
        sum(i["high"] for i in vet_items),
    )


async def test_other_users_pet_is_404(other_client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    for path in ("food", "benchmark"):
        response = await other_client.get(f"/api/v1/pets/{pet['id']}/{path}")
        assert response.status_code == 404


def test_food_status_thresholds() -> None:
    assert food_status(-2) == "out"
    assert food_status(0) == "out"
    assert food_status(BUY_AHEAD_DAYS) == "soon"
    assert food_status(BUY_AHEAD_DAYS + 1) == "ok"


def _status_url(pet: dict[str, Any]) -> str:
    return f"/api/v1/pets/{pet['id']}/food/status"


async def test_food_status_before_any_purchase(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await client.get(_status_url(pet), params={"local_date": TODAY.isoformat()})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "none"
    assert body["runs_out_on"] is None
    assert len(body["shop_links"]) == 2


async def test_purchase_sets_run_out_date_and_saves_expense(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    bought = (TODAY - timedelta(days=27)).isoformat()
    created = await client.post(
        f"/api/v1/pets/{pet['id']}/food/purchases",
        json={"bought_on": bought, "lasts_days": 30, "amount": "54.99"},
    )
    assert created.status_code == 201
    assert created.json()["expense_id"] is not None

    body = (await client.get(_status_url(pet), params={"local_date": TODAY.isoformat()})).json()
    assert body["runs_out_on"] == (TODAY + timedelta(days=3)).isoformat()
    assert body["days_left"] == 3
    assert body["status"] == "soon"
    assert body["buy_by"] == (TODAY + timedelta(days=3 - BUY_AHEAD_DAYS)).isoformat()

    expenses = (await client.get(f"/api/v1/pets/{pet['id']}/expenses")).json()
    assert expenses["items"][0]["category"] == "food"
    assert expenses["items"][0]["amount"] == 54.99


async def test_purchase_without_price_saves_no_expense(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    created = await client.post(
        f"/api/v1/pets/{pet['id']}/food/purchases",
        json={"bought_on": TODAY.isoformat(), "lasts_days": 30},
    )
    assert created.json()["expense_id"] is None
    expenses = (await client.get(f"/api/v1/pets/{pet['id']}/expenses")).json()
    assert expenses["total"] == 0
    body = (await client.get(_status_url(pet), params={"local_date": TODAY.isoformat()})).json()
    assert body["status"] == "ok"


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({"bought_on": "2026-11-14", "lasts_days": 0}, "lasts_days"),
        ({"bought_on": "2026-11-14", "lasts_days": 400}, "lasts_days"),
        ({"bought_on": "2027-01-01", "lasts_days": 30}, "bought_on"),
    ],
)
async def test_purchase_validation(
    client: httpx.AsyncClient, pet: dict[str, Any], payload: dict[str, Any], field: str
) -> None:
    response = await client.post(f"/api/v1/pets/{pet['id']}/food/purchases", json=payload)
    assert response.status_code == 422
    fields = [f["field"] for f in response.json()["error"]["details"]["fields"]]
    assert field in fields
