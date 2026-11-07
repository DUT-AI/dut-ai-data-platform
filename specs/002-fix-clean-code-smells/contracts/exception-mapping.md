# Presentation Exception Mapping Contract

## Presentation Layer Mapping (`core/exceptions/handlers.py`)

The Presentation layer acts as the translating adapter converting pure domain exceptions to HTTP JSON responses:

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.exceptions.base import (
    BusinessRuleViolationError,
    ConflictError,
    DomainException,
    EntityNotFoundError,
    ForbiddenError,
    InvariantViolationError,
    UnauthorizedError,
)

EXCEPTION_HTTP_STATUS_MAP: dict[type[DomainException], int] = {
    EntityNotFoundError: 404,
    ConflictError: 409,
    UnauthorizedError: 401,
    ForbiddenError: 403,
    InvariantViolationError: 400,
    BusinessRuleViolationError: 400,
}


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(DomainException)
    async def domain_exception_handler(
        request: Request, exc: DomainException
    ) -> JSONResponse:
        status_code = EXCEPTION_HTTP_STATUS_MAP.get(type(exc), 400)
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
```
