import httpx


async def test_decode_success_and_free_limit(
    client: httpx.AsyncClient, pet: dict[str, object]
) -> None:
    response = await client.post(
        "/api/v1/estimates/decode",
        json={
            "pet_id": pet["id"],
            "text": "Wellness exam $72.00\nDental cleaning $750.00\nBiohazard fee $18.00",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["counts"] == {"within": 1, "above": 1, "below": 0, "unknown": 1}
    assert [line["verdict"] for line in body["lines"]] == ["within", "above", "unknown"]
    assert body["lines"][2]["range"] is None
    assert body["lines"][2]["question_for_vet"]

    me = await client.get("/api/v1/me")
    assert me.json()["free_decodes_left"] == 0

    limited = await client.post(
        "/api/v1/estimates/decode",
        json={"pet_id": pet["id"], "text": "Wellness exam $72.00"},
    )
    assert limited.status_code == 402
    assert limited.json()["error"]["code"] == "DECODE_LIMIT_REACHED"


async def test_decode_with_no_prices_does_not_use_limit(
    client: httpx.AsyncClient, pet: dict[str, object]
) -> None:
    response = await client.post(
        "/api/v1/estimates/decode",
        json={"pet_id": pet["id"], "text": "Please call us to discuss the plan."},
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "NO_PRICES_FOUND"
    me = await client.get("/api/v1/me")
    assert me.json()["free_decodes_left"] == 1


async def test_decode_other_users_pet_is_not_found(
    client: httpx.AsyncClient, other_client: httpx.AsyncClient
) -> None:
    created = await other_client.post(
        "/api/v1/pets",
        json={
            "name": "Milo",
            "species": "cat",
            "breed": "Domestic Shorthair",
            "age_years": 3,
            "size_class": None,
            "zip": "10001",
            "insured": False,
            "worry": "surprise",
        },
    )
    pet_id = created.json()["id"]

    response = await client.post(
        "/api/v1/estimates/decode",
        json={"pet_id": pet_id, "text": "Wellness exam $72.00"},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "PET_NOT_FOUND"
