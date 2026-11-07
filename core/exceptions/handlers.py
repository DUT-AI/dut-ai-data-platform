from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.exceptions.base import (
    BusinessRuleViolationError,
    ConflictError,
    DomainException,
    EntityNotFoundError,
    ForbiddenError,
    InvariantViolationError,
    OntologySeedingError,
    StorageError,
    UnauthorizedError,
)

EXCEPTION_HTTP_STATUS_MAP: dict[type[DomainException], int] = {
    EntityNotFoundError: 404,
    ConflictError: 409,
    UnauthorizedError: 401,
    ForbiddenError: 403,
    InvariantViolationError: 400,
    BusinessRuleViolationError: 400,
    OntologySeedingError: 500,
    StorageError: 500,
}


def get_status_code_for_exception(exc: DomainException) -> int:
    """Resolve HTTP status code by matching exception type or its MRO ancestors."""
    for cls in type(exc).__mro__:
        if cls in EXCEPTION_HTTP_STATUS_MAP:
            return EXCEPTION_HTTP_STATUS_MAP[cls]
    return 400


def setup_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on FastAPI instance."""

    @app.exception_handler(DomainException)
    async def domain_exception_handler(
        request: Request, exc: DomainException
    ) -> JSONResponse:
        status_code = get_status_code_for_exception(exc)
        return JSONResponse(
            status_code=status_code,
            content={
                "error": {
                    "code": exc.__class__.__name__,
                    "message": exc.message,
                    "details": getattr(exc, "details", {}),
                }
            },
        )
