from typing import Any

import httpx
import pytest

from app.core.reference_data import DATA_DIR, get_reference_data, load_reference_data
from app.features.forecast.care import load_care_schedule
from app.features.forecast.region import load_regional_prices, region_for_zip
from app.features.forecast.service import compute_forecast, spread_over_months

AUSTIN = "78704"


def _by_category(items: list[Any]) -> dict[str, tuple[int, int]]:
    return {item.category: (item.low, item.high) for item in items}


def test_medium_adult_dog_uses_routine_rows_only() -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="dog",
        size_class="medium",
        age_years=4,
        zip_code=AUSTIN,
        include_monthly=False,
    )
    assert _by_category(forecast.items) == {
        "Checkups": (50, 100),
        "Vaccines": (100, 200),
        "Parasite prevention": (120, 240),
        "Dental": (300, 600),
    }
    # Imaging is not routine, so it is not in the yearly forecast.
    assert (forecast.total_low, forecast.total_high) == (570, 1140)
    # Typical: the exam's national average ($60) and the middle of every other range.
    assert {item.category: item.typical for item in forecast.items} == {
        "Checkups": 60,
        "Vaccines": 150,
        "Parasite prevention": 180,
        "Dental": 450,
    }
    assert forecast.total_typical == 840
    assert [item.category for item in forecast.items][0] == "Dental"
    assert forecast.monthly is None


def test_size_multiplier_applies_to_dogs() -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="dog",
        size_class="large",
        age_years=4,
        zip_code=AUSTIN,
        include_monthly=False,
    )
    assert (forecast.total_low, forecast.total_high) == (1140, 2280)


def test_adult_cat_uses_cat_rows_and_species_factor() -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="cat",
        size_class=None,
        age_years=10,
        zip_code=AUSTIN,
        include_monthly=False,
    )
    # Cats are senior from 11, so a 10-year-old is an adult. Species factor 0.5.
    assert forecast.life_stage == "adult"
    assert _by_category(forecast.items) == {
        "Checkups": (25, 50),
        "Vaccines": (40, 60),
        "Parasite prevention": (60, 120),
        "Dental": (150, 300),
    }


def test_senior_follows_the_care_schedule() -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="dog",
        size_class="medium",
        age_years=9,
        zip_code=AUSTIN,
        include_monthly=False,
    )
    # Seniors see the vet twice a year; everything else stays yearly.
    assert forecast.life_stage == "senior"
    assert _by_category(forecast.items)["Checkups"] == (100, 200)


def test_young_pet_gets_series_visits_and_no_dental_cleaning() -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="dog",
        size_class="medium",
        age_years=0,
        zip_code=AUSTIN,
        include_monthly=False,
    )
    assert forecast.life_stage == "young"
    assert _by_category(forecast.items) == {
        "Checkups": (150, 300),
        "Vaccines": (300, 600),
        "Parasite prevention": (120, 240),
    }


@pytest.mark.parametrize(
    ("zip_code", "region", "total"),
    [
        ("78704", "Texas", (570, 1140)),
        ("94110", "California", (684, 1368)),
        ("90210", "Test metro", (855, 1710)),
        ("00601", "US average", (570, 1140)),
    ],
)
def test_local_price_level_by_zip(zip_code: str, region: str, total: tuple[int, int]) -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="dog",
        size_class="medium",
        age_years=4,
        zip_code=zip_code,
        include_monthly=False,
    )
    assert forecast.region.name == region
    assert (forecast.total_low, forecast.total_high) == total


def test_real_data_is_consistent() -> None:
    """The shipped data files load together and give sensible yearly ranges."""
    reference = load_reference_data(DATA_DIR)
    schedule = load_care_schedule(DATA_DIR, reference)
    regional = load_regional_prices(DATA_DIR)

    assert region_for_zip(regional, "10001").name == "New York City area"
    assert region_for_zip(regional, "78704").name == "Texas"
    assert region_for_zip(regional, "72201").name == "Arkansas"

    def total(age: int, zip_code: str = "64101") -> tuple[int, int]:
        forecast = compute_forecast(
            reference,
            species="dog",
            size_class="medium",
            age_years=age,
            zip_code=zip_code,
            include_monthly=False,
            schedule=schedule,
            regional=regional,
        )
        assert all(item.low <= item.typical <= item.high for item in forecast.items)
        notes = " ".join(item.note for item in forecast.items)
        if age >= 1:
            # One-time items only happen in the first year.
            assert "spay" not in notes and "microchip" not in notes
        return forecast.total_low, forecast.total_high

    adult_low, adult_high = total(4)
    senior_low, senior_high = total(9)
    assert adult_low < adult_high
    assert senior_high > adult_high
    # A higher price level means a higher forecast for the same pet.
    assert total(4, "94110")[1] > adult_high

    # Typical vet care (without store-bought parasite medicine) for an adult medium dog in
    # Kansas City should sit near what US dog owners report spending (AVMA 2025: $598),
    # a bit above it because owners often skip recommended care.
    adult = compute_forecast(
        reference,
        species="dog",
        size_class="medium",
        age_years=4,
        zip_code="64101",
        include_monthly=False,
        schedule=schedule,
        regional=regional,
    )
    vet_care = sum(item.typical for item in adult.items if item.category != "medication")
    assert 598 * 0.8 < vet_care < 598 * 2


def test_items_carry_notes_and_source_urls() -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="dog",
        size_class="medium",
        age_years=4,
        zip_code=AUSTIN,
        include_monthly=False,
    )
    vaccines = next(item for item in forecast.items if item.category == "Vaccines")
    assert vaccines.note == "Covers core vaccines (DHPP)."
    assert vaccines.source_urls == ["https://example.com/vaccines-dog"]


def test_monthly_spreads_the_typical_cost_exactly() -> None:
    forecast = compute_forecast(
        get_reference_data(),
        species="dog",
        size_class="medium",
        age_years=4,
        zip_code=AUSTIN,
        include_monthly=True,
    )
    assert forecast.monthly is not None
    assert len(forecast.monthly) == 12
    assert sum(forecast.monthly) == forecast.total_typical == 840


@pytest.mark.parametrize("total", [0, 11, 12, 855, 1001])
def test_spread_over_months_adds_up(total: int) -> None:
    months = spread_over_months(total)
    assert len(months) == 12
    assert sum(months) == total
    assert max(months) - min(months) <= 1


async def test_forecast_endpoint_free_plan_has_no_monthly(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await client.get(f"/api/v1/pets/{pet['id']}/forecast")
    assert response.status_code == 200
    body = response.json()
    assert (body["total_low"], body["total_high"]) == (570, 1140)
    assert body["monthly"] is None
    assert body["items"][0]["source_urls"]
    assert body["life_stage"] == "adult"
    assert body["region"]["name"] == "Texas"
    assert body["region"]["price_level"] == 100.0


async def test_forecast_endpoint_paid_plan_has_monthly(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    await client.post("/api/v1/subscriptions", json={"plan": "yearly"})
    response = await client.get(f"/api/v1/pets/{pet['id']}/forecast")
    monthly = response.json()["monthly"]
    assert len(monthly) == 12
    # The month-by-month view spreads the typical yearly cost.
    assert sum(monthly) == 840
