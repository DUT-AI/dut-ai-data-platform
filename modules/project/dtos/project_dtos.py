from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    template_id: str | None = None
    project_template_version_id: str | None = None
    task_definition_version_id: str | None = None
    project_type: str | None = None
    storage_provider_key: str = Field("minio", min_length=1, max_length=100)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Project name must not be blank.")
        return value


class ProjectUpdateDTO(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("Project name must not be blank.")
        return value


class ProjectResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None = None
    template_id: str | None = None
    task_definition_version_id: str | None = None
    project_template_version_id: str | None = None
    created_by: int
    owner_id: int
    project_type: str
    status: Literal["active", "archived"]
    created_at: datetime | None = None
    updated_at: datetime | None = None
    archived_at: datetime | None = None


class ProjectMemberAddDTO(BaseModel):
    user_id: int
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
    user_id: int
    user_name: str | None = None
    user_email: str | None = None
    user_avatar_url: str | None = None
    role: Literal["owner", "admin", "annotator", "reviewer"]
    status: Literal["active", "inactive"]
    joined_at: datetime | None = None


class ProjectConfigDTO(BaseModel):
    project_id: str
    storage_provider_key: str
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    settings_schema_version: str = "1.0"


class ProjectConfigurationResponseDTO(BaseModel):
    project_id: str
    storage_provider_key: str
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    settings_schema_version: str = "1.0"


class UpdateConfigurationDTO(BaseModel):
    storage_provider_key: str | None = None
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    settings_schema_version: str = "1.0"


class TemplateToolDTO(BaseModel):
    name: str
    desc: str | None = None
    type: str


class TemplateLabelDTO(BaseModel):
    name: str
    color: str | None = None


class ProjectTemplateResponseDTO(BaseModel):
    """One entry of the template catalog (modules/project/data/templates.json)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    group: str
    order: int | None = None
    image: str | None = None
    type: str | None = None
    modality: str
    description: str | None = None
    tools: list[TemplateToolDTO] = Field(default_factory=list)
    labels: list[TemplateLabelDTO] = Field(default_factory=list)
    default_project_configuration: dict[str, Any] = Field(default_factory=dict)
