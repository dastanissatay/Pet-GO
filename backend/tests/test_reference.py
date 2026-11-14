import json
import shutil
from pathlib import Path

import httpx
import pytest

from app.core.reference_data import DATA_DIR, ReferenceDataError, load_reference_data
from app.features.pets.schemas import PetCreate

FIXTURES = Path(__file__).parent / "fixtures" / "data"


async def test_samples_returns_a_valid_pet_and_texts(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/samples")
    assert response.status_code == 200
    body = response.json()
    assert body["pet"]["name"] == "Biscuit"
    assert body["estimate_text"]
    assert body["receipt_text"]


async def test_breeds_prefix_matches_come_first(client: httpx.AsyncClient) -> None:
    response = await client.get("/api/v1/breeds", params={"species": "dog", "q": "LAB"})
    assert response.json() == {"items": ["Labradoodle", "Labrador Retriever"], "total": 2}


async def test_breeds_substring_and_pagination(client: httpx.AsyncClient) -> None:
    response = await client.get(
        "/api/v1/breeds", params={"species": "dog", "q": "retriever", "limit": 1, "offset": 1}
    )
    assert response.json() == {"items": ["Labrador Retriever"], "total": 2}


async def test_breeds_without_query_lists_species_alphabetically(
    client: httpx.AsyncClient,
) -> None:
    response = await client.get("/api/v1/breeds", params={"species": "cat"})
    assert response.json() == {"items": ["Maine Coon", "Siamese"], "total": 2}


@pytest.mark.parametrize(
    "params",
    [{"species": "bird"}, {"species": "dog", "limit": 101}, {"species": "dog", "offset": -1}],
)
async def test_breeds_rejects_bad_params(
    client: httpx.AsyncClient, params: dict[str, object]
) -> None:
    response = await client.get("/api/v1/breeds", params=params)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_shipped_data_files_are_valid() -> None:
    """Guards Person 3's real data in app/data, not the test fixtures."""
    data = load_reference_data(DATA_DIR)
    assert data.prices
    PetCreate.model_validate(data.samples.pet.model_dump())


def _copy_fixtures(tmp_path: Path) -> Path:
    target = tmp_path / "data"
    shutil.copytree(FIXTURES, target)
    return target


def test_quest_pointing_to_unknown_price_fails(tmp_path: Path) -> None:
    data_dir = _copy_fixtures(tmp_path)
    quests = json.loads((data_dir / "quests.json").read_text())
    quests["items"][0]["related_price_id"] = "does-not-exist"
    (data_dir / "quests.json").write_text(json.dumps(quests))

    with pytest.raises(ReferenceDataError, match="unknown price"):
        load_reference_data(data_dir)


def test_price_with_high_below_low_fails(tmp_path: Path) -> None:
    data_dir = _copy_fixtures(tmp_path)
    prices = json.loads((data_dir / "prices.json").read_text())
    prices["items"][0]["high"] = 1
    (data_dir / "prices.json").write_text(json.dumps(prices))

    with pytest.raises(ReferenceDataError, match="high is below low"):
        load_reference_data(data_dir)


def test_missing_file_fails(tmp_path: Path) -> None:
    data_dir = _copy_fixtures(tmp_path)
    (data_dir / "breeds.json").unlink()

    with pytest.raises(ReferenceDataError, match="breeds.json"):
        load_reference_data(data_dir)
