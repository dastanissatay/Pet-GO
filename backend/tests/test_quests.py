import uuid
from datetime import date, timedelta
from typing import Any

import httpx
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.quests.models import QuestCompletion
from app.features.quests.service import (
    compute_streak,
    daily_pick,
    level_for_xp,
    period_key,
)
from tests.conftest import TODAY


def _url(pet: dict[str, Any], quest_id: str) -> str:
    return f"/api/v1/pets/{pet['id']}/quests/{quest_id}/complete"


def test_period_keys() -> None:
    assert period_key("daily", date(2026, 11, 14)) == "2026-11-14"
    assert period_key("weekly", date(2026, 11, 14)) == "2026-W46"
    # ISO weeks cross the new year: Jan 1, 2027 belongs to week 53 of 2026.
    assert period_key("weekly", date(2027, 1, 1)) == "2026-W53"
    assert period_key("monthly", date(2026, 11, 14)) == "2026-11"
    assert period_key("monthly", date(2027, 1, 1)) == "2027-01"


POOL = [f"q{n:02d}" for n in range(13)]


def test_daily_pick_never_repeats_yesterday_and_covers_the_pool() -> None:
    seen: set[str] = set()
    yesterday = daily_pick(POOL, "pet-a", TODAY - timedelta(days=1))
    for offset in range(120):
        today = daily_pick(POOL, "pet-a", TODAY + timedelta(days=offset))
        assert len(today) == 3
        assert not today & yesterday
        seen |= today
        yesterday = today
    assert seen == set(POOL)


def test_daily_pick_is_stable_for_a_day_and_differs_between_pets() -> None:
    assert daily_pick(POOL, "pet-a", TODAY) == daily_pick(POOL, "pet-a", TODAY)
    week = [TODAY + timedelta(days=offset) for offset in range(7)]
    a = [daily_pick(POOL, "pet-a", day) for day in week]
    b = [daily_pick(POOL, "pet-b", day) for day in week]
    assert a != b


def test_daily_pick_returns_a_small_pool_whole() -> None:
    assert daily_pick(["x", "y"], "pet-a", TODAY) == {"x", "y"}


@pytest.mark.parametrize(
    ("xp", "expected"),
    [(0, (1, 100)), (99, (1, 100)), (100, (2, 300)), (299, (2, 300)), (300, (3, None))],
)
def test_levels(xp: int, expected: tuple[int, int | None]) -> None:
    assert level_for_xp(xp) == expected


@pytest.mark.parametrize(
    ("offsets", "streak"),
    [
        ([0, 1, 2], 3),  # done today and the two days before
        ([1, 2], 2),  # nothing yet today: still counts from yesterday
        ([0, 2], 1),  # a gap breaks it
        ([2, 3], 0),  # missed yesterday and today
        ([], 0),
    ],
)
def test_streak(offsets: list[int], streak: int) -> None:
    days = {TODAY - timedelta(days=offset) for offset in offsets}
    assert compute_streak(days, TODAY) == streak


async def test_list_filters_by_species_and_shows_typical_cost(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await client.get(
        f"/api/v1/pets/{pet['id']}/quests", params={"local_date": TODAY.isoformat()}
    )
    assert response.status_code == 200
    body = response.json()
    assert [q["id"] for q in body["daily"]] == ["d-both", "d-dog"]
    assert [q["id"] for q in body["weekly"]] == ["w-both"]
    assert [q["id"] for q in body["monthly"]] == ["m-both"]
    assert body["daily"][0]["typical_cost"] == {
        "price_id": "exam",
        "name": "Wellness exam",
        "low": 50,
        "high": 100,
        "source_url": "https://example.com/exam",
    }
    assert body["daily"][1]["typical_cost"] is None
    # quests.json says {name}; the API fills in the pet's name.
    assert body["daily"][0]["title"] == "Brush Biscuit's teeth"
    assert not any(q["completed"] for q in body["daily"] + body["weekly"] + body["monthly"])


async def test_complete_quest_adds_xp_and_streak(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await client.post(_url(pet, "d-both"), json={"local_date": TODAY.isoformat()})
    assert response.status_code == 200
    assert response.json() == {
        "progress": {"xp": 10, "level": 1, "stage": 1, "next_level_xp": 100, "streak": 1},
        "leveled_up": False,
    }

    listed = await client.get(
        f"/api/v1/pets/{pet['id']}/quests", params={"local_date": TODAY.isoformat()}
    )
    assert listed.json()["daily"][0]["completed"] is True


async def test_daily_quest_once_per_day(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    body = {"local_date": TODAY.isoformat()}
    await client.post(_url(pet, "d-both"), json=body)
    again = await client.post(_url(pet, "d-both"), json=body)
    assert again.status_code == 409
    assert again.json()["error"]["code"] == "QUEST_ALREADY_COMPLETED"

    next_day = await client.post(
        _url(pet, "d-both"), json={"local_date": (TODAY + timedelta(days=1)).isoformat()}
    )
    assert next_day.status_code == 200


async def test_weekly_quest_once_per_iso_week(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    # Saturday and Sunday of the same ISO week.
    saturday = await client.post(_url(pet, "w-both"), json={"local_date": "2026-11-14"})
    sunday = await client.post(_url(pet, "w-both"), json={"local_date": "2026-11-15"})
    assert saturday.status_code == 200
    assert saturday.json()["progress"]["xp"] == 30
    assert sunday.status_code == 409


async def test_monthly_quest_once_per_month(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    first = await client.post(_url(pet, "m-both"), json={"local_date": "2026-11-14"})
    again = await client.post(_url(pet, "m-both"), json={"local_date": "2026-11-15"})
    assert first.status_code == 200
    assert first.json()["progress"]["xp"] == 50
    assert again.status_code == 409

    listing = await client.get(
        f"/api/v1/pets/{pet['id']}/quests", params={"local_date": "2026-11-15"}
    )
    assert listing.json()["monthly"][0]["completed"] is True


async def test_quest_for_other_species_is_404(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    response = await client.post(_url(pet, "d-cat"), json={"local_date": TODAY.isoformat()})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "QUEST_NOT_FOUND"


async def test_local_date_far_from_server_date_is_rejected(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    far = (TODAY - timedelta(days=2)).isoformat()
    complete = await client.post(_url(pet, "d-both"), json={"local_date": far})
    listing = await client.get(f"/api/v1/pets/{pet['id']}/quests", params={"local_date": far})

    for response in (complete, listing):
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "INVALID_LOCAL_DATE"


async def test_crossing_100_xp_levels_up(
    client: httpx.AsyncClient, pet: dict[str, Any], db_session: AsyncSession
) -> None:
    pet_id = uuid.UUID(pet["id"])
    for days_ago in range(1, 10):  # 9 earlier days x 10 XP = 90 XP
        day = TODAY - timedelta(days=days_ago)
        db_session.add(
            QuestCompletion(
                pet_id=pet_id,
                quest_id="d-both",
                period_key=day.isoformat(),
                completed_on=day,
                xp=10,
            )
        )
    await db_session.flush()

    response = await client.post(_url(pet, "d-both"), json={"local_date": TODAY.isoformat()})
    assert response.json() == {
        "progress": {"xp": 100, "level": 2, "stage": 2, "next_level_xp": 300, "streak": 10},
        "leveled_up": True,
    }


async def test_undo_removes_the_completion(client: httpx.AsyncClient, pet: dict[str, Any]) -> None:
    today = TODAY.isoformat()
    await client.post(_url(pet, "d-both"), json={"local_date": today})

    undo = await client.delete(_url(pet, "d-both"), params={"local_date": today})
    assert undo.status_code == 204

    progress = await client.get(f"/api/v1/pets/{pet['id']}/progress", params={"local_date": today})
    assert progress.json()["xp"] == 0

    again = await client.delete(_url(pet, "d-both"), params={"local_date": today})
    assert again.status_code == 404
    assert again.json()["error"]["code"] == "QUEST_NOT_COMPLETED"


async def test_progress_defaults_to_server_date(
    client: httpx.AsyncClient, pet: dict[str, Any]
) -> None:
    await client.post(_url(pet, "d-both"), json={"local_date": TODAY.isoformat()})
    response = await client.get(f"/api/v1/pets/{pet['id']}/progress")
    assert response.json()["streak"] == 1


async def test_other_device_cannot_complete_quests(
    pet: dict[str, Any], other_client: httpx.AsyncClient
) -> None:
    response = await other_client.post(_url(pet, "d-both"), json={"local_date": TODAY.isoformat()})
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PET_NOT_FOUND"
