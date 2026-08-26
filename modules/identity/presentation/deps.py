from typing import Annotated

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import Depends, HTTPException, Request

from modules.identity.client.auth_client import AuthClient
from modules.identity.domain.entities import AuthUser


@inject
async def get_current_user(
    request: Request,
    auth_client: FromDishka[AuthClient],
) -> AuthUser:
    """Dependency to retrieve and validate current authenticated user via AuthClient."""
    access_token = request.cookies.get("access_token")

    if not access_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            access_token = auth_header.split(" ")[1]

    if not access_token:
        raise HTTPException(
            status_code=401, detail="Chưa xác thực: Không tìm thấy token"
        )

    return await auth_client.get_me(access_token)


def require_roles(*allowed_roles: str):
    """Dependency factory to restrict access to specific user roles."""

    async def dependency(
        user: Annotated[AuthUser, Depends(get_current_user)],
    ) -> AuthUser:
        if not any(role in allowed_roles for role in user.role_names):
            raise HTTPException(
                status_code=403, detail="Không có quyền truy cập chức năng này"
            )
        return user

    return dependency


CurrentUser = Annotated[AuthUser, Depends(get_current_user)]
AdminUser = Annotated[AuthUser, Depends(require_roles("admin"))]
