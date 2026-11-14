from typing import Any

import httpx
import pytest

from app.core.reference_data import get_reference_data
from app.features.forecast.service import compute_forecast, spread_over_months


def _by_category(items: list[Any]) -> dict[str, tuple[int, int]]:
    return {item.category: (item.low, item.high) for item in items}


def test_medium_adult_dog_uses_routine_rows_only() -> None:
    forecast = compute_forecast(
        get_reference_data(), species="dog", size_class="medium", age_years=4, include_monthly=False
    )
    assert _by_category(forecast.items) == {
        "Checkups": (50, 100),
        "Vaccines": (100, 200),
        "Parasite prevention": (120, 240),
        "Dental": (300, 600),
    }
    # Imaging is not routine, so it is not in the yearly forecast.
    assert (forecast.total_low, forecast.total_high) == (570, 1140)
    assert [item.category for item in forecast.items][0] == "Dental"
    assert forecast.monthly is None


def test_size_multiplier_applies_to_dogs() -> None:
    forecast = compute_forecast(
        get_reference_data(), species="dog", size_class="large", age_years=4, include_monthly=False
    )
    assert (forecast.total_low, forecast.total_high) == (1140, 2280)


def test_cat_uses_cat_rows_species_and_age_multipliers() -> None:
    forecast = compute_forecast(
        get_reference_data(), species="cat", size_class=None, age_years=10, include_monthly=False
    )
    # Factor 0.5 (cat) x 1.5 (age band over 7) = 0.75; half-dollars round up.
    assert _by_category(forecast.items) == {
        "Checkups": (38, 75),
        "Vaccines": (60, 90),
        "Parasite prevention": (90, 180),
        "Dental": (225, 450),
    }


def test_items_carry_notes_and_source_urls() -> None:
    forecast = compute_forecast(
        get_reference_data(), species="dog", size_class="medium", age_years=4, include_monthly=False
    )
    vaccines = next(item for item in forecast.items if item.category == "Vaccines")
    assert vaccines.note == "Covers core vaccines (DHPP)."
    assert vaccines.source_urls == ["https://example.com/vaccines-dog"]


def test_monthly_spreads_the_midpoint_exactly() -> None:
    forecast = compute_forecast(
        get_reference_data(), species="dog", size_class="medium", age_years=4, include_monthly=True
    )
    assert forecast.monthly is not None
    assert len(forecast.monthly) == 12
    assert sum(forecast.monthly) == 855  # midpoint of 570 and 1140


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


async def test_forecast_endpoint_paid_plan_has_monthly(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    await client.post("/api/v1/subscriptions", json={"plan": "yearly"})
    response = await client.get(f"/api/v1/pets/{pet['id']}/forecast")
    monthly = response.json()["monthly"]
    assert len(monthly) == 12
    assert sum(monthly) == 855
