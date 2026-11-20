from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.config.auth import auth_settings
from core.exceptions import UnauthorizedException
from core.security.jwt import decode_access_token
from modules.identity.dtos.auth_dtos import AuthUserDTO as AuthUser
from modules.identity.services.sso_claims import auth_user_from_claims

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    """Verify the DUT AI SSO access token issued by Manage.

    Precedence: shared HttpOnly cookie, then `Authorization: Bearer` (API clients, tests).
    """
    token = request.cookies.get(auth_settings.auth_cookie_name)
    if not token and credentials and credentials.credentials:
        token = credentials.credentials
    if not token:
        raise _unauthorized("Thiếu token xác thực (Cookie hoặc Authorization header)")

    try:
        return auth_user_from_claims(decode_access_token(token))
    except UnauthorizedException as exc:
        raise _unauthorized(f"Token không hợp lệ hoặc đã hết hạn: {exc}") from exc


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
