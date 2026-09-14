from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

SelectorType = Literal[
    "FULL_ASSET", "RECORD", "TEXT_SPAN", "TIME_RANGE", "FRAME_RANGE", "DOCUMENT_PAGE"
]


class AnnotationTargetDTO(BaseModel):
    asset_id: str
    selector_type: SelectorType = "FULL_ASSET"
    selector: dict[str, Any] = Field(default_factory=dict)


class AnnotationRevisionResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    annotation_id: str
    revision_number: int
    ontology_version_id: str
    created_by: str
    source: str
    created_at: datetime | None = None
    results: list[dict[str, Any]] = Field(default_factory=list)
    category_ids: list[str] = Field(default_factory=list)


class AnnotationCreateDTO(BaseModel):
    asset_id: str
    project_id: str
    ontology_version_id: str
    target_type: SelectorType = "FULL_ASSET"
    target_selector: dict[str, Any] = Field(default_factory=dict)
    source: Literal["human", "machine"] = "human"
    results: list[dict[str, Any]] = Field(default_factory=list)


class RevisionCreateDTO(BaseModel):
    ontology_version_id: str | None = None
    source: Literal["human", "machine"] = "human"
    results: list[dict[str, Any]] = Field(default_factory=list)


class AnnotationResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    asset_id: str
    project_id: str
    target_type: str = "FULL_ASSET"
    target_selector: dict[str, Any] = Field(default_factory=dict)
    ontology_version_id: str | None = None
    created_by: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    latest_revision: AnnotationRevisionResponseDTO | None = None
    revisions: list[AnnotationRevisionResponseDTO] = Field(default_factory=list)


# For backward compatibility if needed
class LabelStudioSyncWebhookDTO(BaseModel):
    event: str | None = None
    project: dict[str, Any] | None = None
    task: dict[str, Any] | None = None
    annotation: dict[str, Any] | None = None
    result: list[dict[str, Any]] | None = None


class OpenInLabelStudioRequestDTO(BaseModel):
    ontology_version_id: str
    project_id: str
    presigned_url: str
    dataset_version_id: str | None = None


class OpenInLabelStudioResponseDTO(BaseModel):
    task_url: str
    ls_project_id: int
    ls_task_id: int
