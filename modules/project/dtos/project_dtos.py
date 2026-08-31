from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    task_definition_version_id: str | None = None
    project_type: str | None = None
    project_template_version_id: str | None = None
    annotation_provider_key: str = Field("label_studio", min_length=1, max_length=100)
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
    task_definition_version_id: str | None = None
    project_template_version_id: str | None = None
    created_by: str
    owner_id: str
    project_type: str
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    archived_at: datetime | None = None


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
    user_name: str | None = None
    user_email: str | None = None
    user_avatar_url: str | None = None
    role: str
    status: str
    joined_at: datetime | None = None


class ProjectConfigDTO(BaseModel):
    project_id: str
    annotation_provider_key: str
    storage_provider_key: str
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    settings_schema_version: str = "1.0"


class ProjectConfigurationResponseDTO(BaseModel):
    project_id: str
    annotation_provider_key: str
    storage_provider_key: str
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    settings_schema_version: str = "1.0"


class UpdateConfigurationDTO(BaseModel):
    annotation_provider_key: str | None = None
    storage_provider_key: str | None = None
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = Field(default_factory=dict)
    settings_schema_version: str = "1.0"


class TaskDefinitionVersionResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    task_definition_id: str
    version: str
    input_schema: dict[str, Any]
    capability_schema: dict[str, Any]
    constraints: dict[str, Any] = Field(default_factory=dict)
    status: str
    published_at: datetime | None = None


class ProjectTemplateVersionResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_template_id: str
    version: str
    default_project_configuration: dict[str, Any]
    ontology_template_ref: str | None = None
    status: str
    providers: list[str] = Field(default_factory=list)
    published_at: datetime | None = None


class ProjectTemplateResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    key: str
    name: str
    description: str | None = None
    task_definition_id: str
    status: str
    versions: list[ProjectTemplateVersionResponseDTO] = Field(default_factory=list)


class TaskDefinitionResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    key: str
    name: str
    description: str | None = None
    category: str
    modality: str
    status: str
    versions: list[TaskDefinitionVersionResponseDTO] = Field(default_factory=list)
    templates: list[ProjectTemplateResponseDTO] = Field(default_factory=list)


class TaskDefinitionCreateDTO(BaseModel):
    key: str = Field(..., min_length=3, max_length=120, pattern=r"^[a-z0-9_.-]+$")
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    category: str = Field(..., min_length=1, max_length=80)
    modality: str = Field(..., min_length=1, max_length=80)


class TaskDefinitionVersionCreateDTO(BaseModel):
    version: str = Field(..., min_length=1, max_length=50)
    input_schema: dict[str, Any]
    capability_schema: dict[str, Any]
    constraints: dict[str, Any] = Field(default_factory=dict)


class ProjectTemplateCreateDTO(BaseModel):
    key: str = Field(..., min_length=3, max_length=120, pattern=r"^[a-z0-9_.-]+$")
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(None, max_length=2000)
    task_definition_id: str = Field(..., min_length=1)


class ProjectTemplateVersionCreateDTO(BaseModel):
    version: str = Field(..., min_length=1, max_length=50)
    default_project_configuration: dict[str, Any] = Field(default_factory=dict)
    ontology_template_ref: str | None = Field(None, max_length=255)
    provider_keys: list[str] = Field(default_factory=list)
