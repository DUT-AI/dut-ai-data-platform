from typing import Any

from fastapi import HTTPException, Request

from shared.auth.client import AuthClient, AuthUser


def create_auth_dependency(auth_client: AuthClient) -> Any:
    """Dependency factory returning FastAPI current user extraction dependency."""

    async def get_current_user(request: Request) -> AuthUser:
        token = request.cookies.get("access_token")

        if not token:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            raise HTTPException(
                status_code=401,
                detail="Authentication failed: No access token provided",
            )

        try:
            return await auth_client.get_me(token)
        except Exception as e:
            raise HTTPException(status_code=401, detail=f"Authentication failed: {e!s}")

    return get_current_user
