from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, status

from apps.api.deps.auth import CurrentUser
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
    use_case: FromDishka[LoginUseCase],
):
    return await use_case.execute(payload)


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
async def logout() -> LogoutResponseDTO:
    """Perform user session logout (client token disposal)."""
    return LogoutResponseDTO()
