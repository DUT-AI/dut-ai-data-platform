from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Response, status

from modules.identity.dtos.auth_dtos import (
    AuthUserResponseDTO,
    LoginRequestDTO,
    TokenResponseDTO,
)
from modules.identity.presentation.deps import CurrentUser
from modules.identity.use_cases import LoginUseCase

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponseDTO, status_code=status.HTTP_200_OK)
@inject
async def login(
    data: LoginRequestDTO,
    response: Response,
    use_case: FromDishka[LoginUseCase],
):
    """Perform login against Auth Server and set HTTP-only cookie."""
    tokens = await use_case.execute(data)
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        httponly=True,
        samesite="lax",
    )
    return tokens


@router.get("/me", response_model=AuthUserResponseDTO)
@inject
async def get_me(current_user: CurrentUser):
    """Retrieve current authenticated user details."""
    return current_user


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    """Clear access token cookie."""
    response.delete_cookie(key="access_token")
    return {"message": "Logout successful"}
