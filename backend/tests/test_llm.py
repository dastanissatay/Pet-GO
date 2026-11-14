import json

import httpx
import pytest
from pydantic import BaseModel

from app.core.llm import AnthropicJsonClient, LLMInvalidResponseError


class Answer(BaseModel):
    value: int


async def test_llm_retries_invalid_json_once() -> None:
    calls = 0

    def handler(_: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        text = "not json" if calls == 1 else json.dumps({"value": 7})
        return httpx.Response(200, json={"content": [{"type": "text", "text": text}]})

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http_client:
        client = AnthropicJsonClient("test-key", client=http_client)
        answer = await client.parse_json(
            system_prompt="Return JSON.", user_message="Input", response_model=Answer
        )

    assert answer.value == 7
    assert calls == 2


async def test_llm_raises_domain_error_after_two_invalid_responses() -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(200, json={"content": [{"type": "text", "text": "bad"}]})
    )
    async with httpx.AsyncClient(transport=transport) as http_client:
        client = AnthropicJsonClient("test-key", client=http_client)
        with pytest.raises(LLMInvalidResponseError):
            await client.parse_json(
                system_prompt="Return JSON.", user_message="Input", response_model=Answer
            )
