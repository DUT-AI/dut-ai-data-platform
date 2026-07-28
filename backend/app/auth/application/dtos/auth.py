from pydantic import BaseModel, Field


class LoginRequestDTO(BaseModel):
    email: str = Field(..., description="Email address for login")
    password: str = Field(..., description="User password")


class TokenResponseDTO(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AuthUserResponseDTO(BaseModel):
    id: int
    name: str
    email: str
    status: str = "ACTIVE"
    avatar_url: str | None = None
    role_names: list[str] = Field(default_factory=list)
