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
    created_by: int
    ontology_version_id: str
    id: str = field(default_factory=generate_ulid)
    source: RevisionSource = "human"
    results: list[dict[str, Any]] = field(default_factory=list)
    category_ids: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def __post_init__(self):
        if isinstance(self.created_by, str) and self.created_by.isdigit():
            self.created_by = int(self.created_by)


@dataclass
class AnnotationEntity:
    """Aggregate Root for Asset Annotation.

    Protects invariants:
    - Maintains sequential revision numbers.
    - Encapsulates target selector.
    """

    asset_id: str
    project_id: str
    created_by: int
    target_type: SelectorType = "FULL_ASSET"
    target_selector: dict[str, Any] = field(default_factory=dict)
    ontology_version_id: str | None = None
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    revisions: list[AnnotationRevisionEntity] = field(default_factory=list)

    def __post_init__(self):
        if isinstance(self.created_by, str) and self.created_by.isdigit():
            self.created_by = int(self.created_by)

    @property
    def target(self) -> AnnotationTarget:
        return AnnotationTarget(
            asset_id=self.asset_id,
            selector_type=self.target_type,
            selector=self.target_selector,
        )

    @property
    def latest_revision(self) -> AnnotationRevisionEntity | None:
        return self.revisions[-1] if self.revisions else None

    def add_revision(
        self,
        source: RevisionSource,
        results: list[dict[str, Any]],
        category_ids: list[str],
        created_by: int,
        ontology_version_id: str | None = None,
    ) -> AnnotationRevisionEntity:
        """Domain Method: Appends a new revision with guaranteed sequential revision_number."""
        next_revision_number = (
            max((r.revision_number for r in self.revisions), default=0) + 1
        )
        author_id = int(created_by) if str(created_by).isdigit() else created_by
        revision = AnnotationRevisionEntity(
            annotation_id=self.id,
            revision_number=next_revision_number,
            ontology_version_id=ontology_version_id or self.ontology_version_id or "",
            created_by=author_id,
            source=source,
            results=results,
            category_ids=category_ids,
        )
        self.revisions.append(revision)
        return revision
