from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Header, HTTPException, status

from apps.api.deps.auth import CurrentUser
from modules.identity.domain.entities import AuthUser
from modules.identity.dtos.auth_dtos import LoginRequestDTO, LoginResponseDTO
from modules.identity.use_cases import GetMeUseCase, LoginUseCase

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
@inject
async def get_me(
    current_user: CurrentUser,
    use_case: FromDishka[GetMeUseCase],
    authorization: str | None = Header(default=None),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid token",
        )

    token = authorization.split(" ")[1]
    return await use_case.execute(token)
