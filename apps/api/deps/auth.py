from typing import Annotated

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config import settings
from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthUser

bearer_scheme = HTTPBearer(auto_error=False)


@inject
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    client: FromDishka[AuthClient] = None,  # type: ignore
) -> AuthUser:
    """Verify user identity via AuthClient (DUT Central Auth is the single Source of Truth)."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Thiếu Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    auth_client = client or AuthClient(
        auth_server_url=settings.auth_server_url,
        timeout=settings.external_api_timeout,
    )
    return await auth_client.get_me(credentials.credentials)


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
