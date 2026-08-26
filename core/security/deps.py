from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.exceptions import UnauthorizedException
from core.security.jwt import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user_payload(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict:
    """Extract and decode current authenticated user JWT payload."""
    if not credentials:
        raise UnauthorizedException("Missing Authorization Bearer header credentials")

    payload = decode_access_token(credentials.credentials)
    return payload


async def get_current_user_id(
    payload: Annotated[dict, Depends(get_current_user_payload)],
) -> str:
    """Extract sub (user_id) from validated JWT payload."""
    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException("Token payload does not contain subject ID")
    return str(user_id)
