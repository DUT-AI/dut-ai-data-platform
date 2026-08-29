from typing import Annotated

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config import settings
from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthUser

bearer_scheme = HTTPBearer(auto_error=False)


@inject
async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    client: FromDishka[AuthClient] = None,  # type: ignore
) -> AuthUser:
    """Verify user identity via AuthClient (DUT Central Auth is the single Source of Truth).

    Precedence:
    1. HttpOnly Cookie (`settings.auth_cookie_name`) - primary for browser clients.
    2. Authorization Bearer header - fallback for API clients / external integrations / test suites.
    """
    token: str | None = request.cookies.get(settings.auth_cookie_name)
    if not token and credentials and credentials.credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu token xác thực (Cookie hoặc Authorization header)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    auth_client = client or AuthClient(
        auth_server_url=settings.auth_server_url,
        timeout=settings.external_api_timeout,
    )
    return await auth_client.get_me(token)


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
