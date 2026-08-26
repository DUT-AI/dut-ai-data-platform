from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    project_type: Literal[
        "detection",
        "ocr",
        "nlp",
        "classification",
        "segmentation",
        "captioning",
    ]


class ProjectUpdateDTO(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: Literal["active", "archived"] | None = None


class ProjectResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    project_type: str
    owner_id: str
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ProjectMemberAddDTO(BaseModel):
    user_id: str
    role: Literal["admin", "annotator", "reviewer"]


AddMemberDTO = ProjectMemberAddDTO


class ProjectMemberUpdateDTO(BaseModel):
    role: Literal["owner", "admin", "annotator", "reviewer"] | None = None
    status: Literal["active", "inactive"] | None = None


class UpdateMemberRoleDTO(BaseModel):
    role: Literal["owner", "admin", "annotator", "reviewer"]


class ProjectMemberResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: str
    role: str
    status: str
    joined_at: datetime | None = None


class ProjectConfigDTO(BaseModel):
    project_id: str
    settings: dict[str, Any] = Field(default_factory=dict)


class ProjectConfigurationResponseDTO(BaseModel):
    project_id: str
    settings: dict[str, Any] = Field(default_factory=dict)


class UpdateConfigurationDTO(BaseModel):
    settings: dict[str, Any] = Field(default_factory=dict)
