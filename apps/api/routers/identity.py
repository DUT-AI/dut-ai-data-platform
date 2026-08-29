from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Response, status

from apps.api.deps.auth import CurrentUser
from core.config import settings
from modules.identity.domain.entities import AuthUser
from modules.identity.dtos.auth_dtos import (
    LoginRequestDTO,
    LoginResponseDTO,
    LogoutResponseDTO,
)
from modules.identity.use_cases import LoginUseCase

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=LoginResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="User Login",
)
@inject
async def login(
    payload: LoginRequestDTO,
    response: Response,
    use_case: FromDishka[LoginUseCase],
) -> LoginResponseDTO:
    res = await use_case.execute(payload)
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=res.access_token,
        httponly=True,
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
        max_age=settings.auth_cookie_max_age,
        path="/",
    )
    return res


@router.get(
    "/me",
    response_model=AuthUser,
    status_code=status.HTTP_200_OK,
    summary="Get current logged in user information",
)
async def get_me(
    current_user: CurrentUser,
) -> AuthUser:
    """Return current logged in user (validated exactly once via CurrentUser dependency)."""
    return current_user


@router.post(
    "/logout",
    response_model=LogoutResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="User Logout",
)
async def logout(response: Response) -> LogoutResponseDTO:
    """Perform user session logout (clearing HttpOnly auth cookie)."""
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.auth_cookie_secure,
        samesite=settings.auth_cookie_samesite,
    )
    return LogoutResponseDTO()
