from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserRegisterInput(BaseModel):
    email: str = Field(..., description="Email address of the user")
    password: str = Field(..., min_length=6, description="Password of the user")
    name: str = Field(..., description="Full name of the user")


class UserLoginInput(BaseModel):
    email: str = Field(..., description="Email address of the user")
    password: str = Field(..., description="Password of the user")


class UserUpdateInput(BaseModel):
    name: str | None = Field(None, description="Full name of the user")
    avatar_url: str | None = Field(None, description="Avatar image URL")


class UserOut(BaseModel):
    id: int
    email: str
    name: str | None = None
    avatar_url: str | None = None
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UploadPresignInput(BaseModel):
    key: str = Field(..., description="S3 file path / key name")
    content_type: str = Field(..., description="File MIME type (e.g. image/jpeg)")


class UploadOut(BaseModel):
    presigned_url: str | None = None
    key: str
    public_url: str
