from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, HTTPException, Response, status

from apps.api.auth_cookies import clear_sso_cookies, set_sso_cookies
from apps.api.deps.auth import CurrentUser
from core.config.auth import auth_settings
from modules.identity.domain.entities import AuthUser
from modules.identity.dtos.auth_dtos import LoginRequestDTO, LogoutResponseDTO
from modules.identity.use_cases import GetMeUseCase, LoginUseCase

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


@router.post(
    "/login",
    response_model=AuthUser,
    status_code=status.HTTP_200_OK,
    summary="Local development login (disabled in production)",
)
@inject
async def login(
    payload: LoginRequestDTO,
    response: Response,
    use_case: FromDishka[LoginUseCase],
) -> AuthUser:
    if not auth_settings.auth_local_login_enabled:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    session = await use_case.execute(payload)
    set_sso_cookies(response, session)
    return session.user


@router.get(
    "/me",
    response_model=AuthUser,
    status_code=status.HTTP_200_OK,
    summary="Current DUT AI SSO user",
)
@inject
async def get_me(
    current_user: CurrentUser,
    use_case: FromDishka[GetMeUseCase],
) -> AuthUser:
    return await use_case.execute(current_user)


@router.post(
    "/logout",
    response_model=LogoutResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Log out of every DUT AI app (clears the shared SSO cookies)",
)
async def logout(response: Response) -> LogoutResponseDTO:
    clear_sso_cookies(response)
    return LogoutResponseDTO()
