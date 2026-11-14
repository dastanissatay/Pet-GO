import httpx


async def test_receipt_route_uses_regex_fallback(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/receipts/parse",
        json={
            "text": "Oak Hill Animal Clinic\nDate 10/28/2026\nWellness exam $89.00\nTOTAL $89.00"
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert float(body["amount"]) == 89.0
    assert body["spent_on"] == "2026-10-28"
    assert body["category"] == "wellness"


async def test_receipt_route_rejects_text_without_total(client: httpx.AsyncClient) -> None:
    response = await client.post(
        "/api/v1/receipts/parse", json={"text": "No final amount on this note"}
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "NO_AMOUNT_FOUND"
