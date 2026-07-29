from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

ResultType = Literal[
    "bbox", "polygon", "text_region", "caption", "classification", "ner"
]
RevisionSource = Literal["human", "machine"]


@dataclass
class BBoxGeometry:
    x: float
    y: float
    width: float
    height: float


@dataclass
class PolygonGeometry:
    points: list[list[float]]  # [[x1, y1], [x2, y2], ...]


@dataclass
class AnnotationResultEntity:
    id: str
    revision_id: str
    result_type: ResultType
    category_id: str | None = None
    geometry: dict[str, Any] | None = None
    payload: dict[str, Any] | None = None
    attributes: dict[str, Any] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class AnnotationRevisionEntity:
    id: str
    annotation_id: str
    revision_number: int
    created_by: str
    source: RevisionSource = "human"
    created_at: datetime | None = None
    updated_at: datetime | None = None
    results: list[AnnotationResultEntity] = field(default_factory=list)


@dataclass
class AnnotationEntity:
    id: str
    asset_id: str
    project_id: str
    ontology_version_id: str
    created_by: str
    label_studio_task_id: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    revisions: list[AnnotationRevisionEntity] = field(default_factory=list)
