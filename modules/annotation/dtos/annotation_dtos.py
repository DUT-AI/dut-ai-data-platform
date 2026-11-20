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
    created_by: int
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
    created_by: int
    created_at: datetime | None = None
    updated_at: datetime | None = None
    latest_revision: AnnotationRevisionResponseDTO | None = None
    revisions: list[AnnotationRevisionResponseDTO] = Field(default_factory=list)


class BatchAssetStatusItemDTO(BaseModel):
    asset_id: str
    is_annotated: bool
    objects_count: int
    last_updated_at: datetime | None = None


class BatchAssetStatusRequestDTO(BaseModel):
    asset_ids: list[str] = Field(default_factory=list)


class BatchAssetStatusResponseDTO(BaseModel):
    statuses: dict[str, BatchAssetStatusItemDTO] = Field(default_factory=dict)
