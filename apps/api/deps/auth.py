from typing import Annotated

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config import settings
from core.security.jwt import decode_access_token
from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthPayload, AuthUser

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_payload(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthPayload:
    """Extract and validate JWT token payload using local secret key (Legacy/Fallback)."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực không hợp lệ hoặc thiếu Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload_dict = decode_access_token(credentials.credentials)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token xác thực đã hết hạn hoặc không hợp lệ: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from e

    if not payload_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token xác thực đã hết hạn hoặc không hợp lệ",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload_dict.get("sub") or payload_dict.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin User ID",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return AuthPayload(
        user_id=str(user_id),
        email=payload_dict.get("email"),
        role=payload_dict.get("role", "user"),
        raw_payload=payload_dict,
    )


@inject
async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    client: FromDishka[AuthClient] = None,  # type: ignore
) -> AuthUser:
    """Verify user identity via AuthClient (DUT Central Auth)."""
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


CurrentUserPayload = Annotated[AuthPayload, Depends(get_current_user_payload)]
CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
