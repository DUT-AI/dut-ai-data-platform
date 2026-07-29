from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AnnotationResultCreateDTO(BaseModel):
    category_id: str | None = None
    result_type: Literal[
        "bbox", "polygon", "text_region", "caption", "classification", "ner"
    ]
    geometry: dict[str, Any] | None = None
    payload: dict[str, Any] | None = None
    attributes: dict[str, Any] | None = None


class AnnotationResultResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    revision_id: str
    category_id: str | None = None
    result_type: str
    geometry: dict[str, Any] | None = None
    payload: dict[str, Any] | None = None
    attributes: dict[str, Any] | None = None
    created_at: datetime | None = None


class AnnotationRevisionResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    annotation_id: str
    revision_number: int
    created_by: str
    source: str
    created_at: datetime | None = None
    results: list[AnnotationResultResponseDTO] = Field(default_factory=list)


class AnnotationCreateDTO(BaseModel):
    asset_id: str
    project_id: str
    ontology_version_id: str
    source: Literal["human", "machine"] = "human"
    results: list[AnnotationResultCreateDTO] = Field(default_factory=list)


class RevisionCreateDTO(BaseModel):
    source: Literal["human", "machine"] = "human"
    results: list[AnnotationResultCreateDTO] = Field(default_factory=list)


class AnnotationResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    asset_id: str
    project_id: str
    ontology_version_id: str
    created_by: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    latest_revision: AnnotationRevisionResponseDTO | None = None
    revisions: list[AnnotationRevisionResponseDTO] = Field(default_factory=list)


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
