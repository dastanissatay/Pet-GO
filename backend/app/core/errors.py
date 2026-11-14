import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    """Domain error. Services raise these; the handlers below turn them into HTTP."""

    status_code = 400
    code = "BAD_REQUEST"

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        self.details = details or {}


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class UpstreamError(AppError):
    """An outside service (the LLM) failed or timed out."""

    status_code = 502
    code = "UPSTREAM_ERROR"


class NotConfiguredError(AppError):
    status_code = 503
    code = "NOT_CONFIGURED"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class ServiceUnavailableError(AppError):
    status_code = 503
    code = "SERVICE_UNAVAILABLE"


class UnprocessableError(AppError):
    """The request is well-formed but breaks a business rule."""

    status_code = 422
    code = "UNPROCESSABLE"


class PaymentRequiredError(AppError):
    """The action needs a paid plan (for example DECODE_LIMIT_REACHED)."""

    status_code = 402
    code = "PAYMENT_REQUIRED"


class DeviceIdRequiredError(AppError):
    status_code = 400
    code = "DEVICE_ID_REQUIRED"

    def __init__(self) -> None:
        super().__init__("Send your device ID as a UUID in the X-Device-Id header.")


def error_response(
    status_code: int, code: str, message: str, details: dict[str, Any] | None = None
) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details or {}}}
    return JSONResponse(status_code=status_code, content=body)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {
                "field": ".".join(str(p) for p in err["loc"][1:]),
                # Pydantic prefixes our own validator messages; the UI shows them as is.
                "message": str(err["msg"]).removeprefix("Value error, "),
            }
            for err in exc.errors()
        ]
        return error_response(
            422, "VALIDATION_ERROR", "Some fields are invalid.", {"fields": fields}
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "NOT_FOUND" if exc.status_code == 404 else f"HTTP_{exc.status_code}"
        return error_response(exc.status_code, code, str(exc.detail))

    @app.exception_handler(Exception)
    async def handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error", exc_info=exc)
        return error_response(500, "INTERNAL_ERROR", "Something went wrong on our side.")
