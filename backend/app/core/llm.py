import json
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from app.core.config import get_settings

ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

ResponseT = TypeVar("ResponseT", bound=BaseModel)


class LLMError(RuntimeError):
    """Base domain error for an unavailable or invalid LLM response."""


class LLMUnavailableError(LLMError):
    """The upstream model could not be reached or returned an HTTP error."""


class LLMInvalidResponseError(LLMError):
    """The model returned invalid JSON twice."""


class AnthropicJsonClient:
    def __init__(
        self,
        api_key: str,
        model: str = "claude-haiku-5-5",
        *,
        client: httpx.AsyncClient | None = None,
        timeout_seconds: float = 20.0,
    ) -> None:
        self._api_key = api_key
        self._model = model
        self._client = client
        self._timeout_seconds = timeout_seconds

    async def parse_json(
        self,
        *,
        system_prompt: str,
        user_message: str,
        response_model: type[ResponseT],
    ) -> ResponseT:
        last_error: json.JSONDecodeError | ValidationError | None = None
        for _ in range(2):
            try:
                raw = await self._message(system_prompt=system_prompt, user_message=user_message)
                return response_model.model_validate(json.loads(raw))
            except (json.JSONDecodeError, ValidationError) as error:
                last_error = error
        raise LLMInvalidResponseError("The model returned invalid structured data.") from last_error

    async def _message(self, *, system_prompt: str, user_message: str) -> str:
        payload = {
            "model": self._model,
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_message}],
        }
        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        try:
            if self._client is not None:
                response = await self._client.post(
                    ANTHROPIC_MESSAGES_URL,
                    headers=headers,
                    json=payload,
                    timeout=self._timeout_seconds,
                )
            else:
                async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                    response = await client.post(
                        ANTHROPIC_MESSAGES_URL, headers=headers, json=payload
                    )
            response.raise_for_status()
        except httpx.HTTPError as error:
            raise LLMUnavailableError("The language model is unavailable.") from error

        try:
            body = response.json()
        except ValueError as error:
            raise LLMUnavailableError("The language model returned invalid JSON.") from error
        content = body.get("content") if isinstance(body, dict) else None
        if not isinstance(content, list) or not content:
            raise LLMUnavailableError("The language model returned no content.")
        first = content[0]
        if not isinstance(first, dict):
            raise LLMUnavailableError("The language model returned no text content.")
        text = first.get("text")
        if not isinstance(text, str):
            raise LLMUnavailableError("The language model returned no text content.")
        return text


def get_llm_client() -> AnthropicJsonClient | None:
    settings = get_settings()
    if settings.llm_api_key is None:
        return None
    return AnthropicJsonClient(
        settings.llm_api_key,
        settings.llm_model,
        timeout_seconds=settings.llm_timeout_seconds,
    )
