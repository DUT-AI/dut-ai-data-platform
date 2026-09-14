from typing import Any

from sqlalchemy import (
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    inspect,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin
from modules.annotation.domain import (
    AnnotationEntity,
    AnnotationRevisionEntity,
    RevisionSource,
    SelectorType,
)


class AnnotationModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "annotations"
    __table_args__ = (
        Index("ix_annotations_asset_id", "asset_id"),
        Index("ix_annotations_project_id", "project_id"),
        Index(
            "ix_annotations_target_selector", "target_selector", postgresql_using="gin"
        ),
    )

    asset_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    target_type: Mapped[SelectorType] = mapped_column(
        String(50), default="FULL_ASSET", nullable=False
    )
    target_selector: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict, nullable=False
    )
    ontology_version_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("ontology_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    label_studio_task_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    revisions: Mapped[list["AnnotationRevisionModel"]] = relationship(
        "AnnotationRevisionModel",
        back_populates="annotation",
        cascade="all, delete-orphan",
        order_by="AnnotationRevisionModel.revision_number.asc()",
    )

    def to_entity(self):
        unloaded = inspect(self).unloaded

        revs = (
            [r.to_entity() for r in self.revisions]
            if "revisions" not in unloaded and self.revisions
            else []
        )
        return AnnotationEntity(
            id=self.id,
            asset_id=self.asset_id,
            project_id=self.project_id,
            target_type=self.target_type,
            target_selector=self.target_selector or {},
            ontology_version_id=self.ontology_version_id,
            created_by=self.created_by,
            created_at=self.created_at,
            updated_at=self.updated_at,
            revisions=revs,
        )


class AnnotationRevisionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "annotation_revisions"
    __table_args__ = (
        UniqueConstraint(
            "annotation_id",
            "revision_number",
            name="uq_annotation_revision_number",
        ),
        Index("ix_annotation_revisions_results", "results", postgresql_using="gin"),
        Index(
            "ix_annotation_revisions_category_ids",
            "category_ids",
            postgresql_using="gin",
        ),
    )

    annotation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("annotations.id", ondelete="CASCADE"),
        nullable=False,
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    ontology_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("ontology_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[RevisionSource] = mapped_column(
        String(50), default="human", nullable=False
    )
    results: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )
    category_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)

    annotation: Mapped["AnnotationModel"] = relationship(
        "AnnotationModel", back_populates="revisions"
    )

    def to_entity(self):
        return AnnotationRevisionEntity(
            id=self.id,
            annotation_id=self.annotation_id,
            revision_number=self.revision_number,
            ontology_version_id=self.ontology_version_id,
            created_by=self.created_by,
            source=self.source,
            results=self.results or [],
            category_ids=self.category_ids or [],
            created_at=self.created_at,
            updated_at=self.updated_at,
        )
