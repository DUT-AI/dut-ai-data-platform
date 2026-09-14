from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

from core.utils.id_generator import generate_ulid

SelectorType = Literal[
    "FULL_ASSET", "RECORD", "TEXT_SPAN", "TIME_RANGE", "FRAME_RANGE", "DOCUMENT_PAGE"
]
RevisionSource = Literal["human", "machine"]


@dataclass(frozen=True)
class AnnotationTarget:
    asset_id: str
    selector_type: SelectorType = "FULL_ASSET"
    selector: dict[str, Any] = field(default_factory=dict)


@dataclass
class AnnotationRevisionEntity:
    annotation_id: str
    revision_number: int
    created_by: str
    ontology_version_id: str
    id: str = field(default_factory=generate_ulid)
    source: RevisionSource = "human"
    results: list[dict[str, Any]] = field(default_factory=list)
    category_ids: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class AnnotationEntity:
    asset_id: str
    project_id: str
    created_by: str
    target_type: SelectorType = "FULL_ASSET"
    target_selector: dict[str, Any] = field(default_factory=dict)
    ontology_version_id: str | None = None
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    revisions: list[AnnotationRevisionEntity] = field(default_factory=list)

    @property
    def target(self) -> AnnotationTarget:
        return AnnotationTarget(
            asset_id=self.asset_id,
            selector_type=self.target_type,
            selector=self.target_selector,
        )
