from typing import Any

from sqlalchemy import (
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin


class AnnotationModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "annotations"
    __table_args__ = (
        UniqueConstraint(
            "asset_id", "ontology_version_id", name="uq_asset_ontology_version"
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
    ontology_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("ontology_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    label_studio_task_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    revisions: Mapped[list["AnnotationRevisionModel"]] = relationship(
        "AnnotationRevisionModel",
        back_populates="annotation",
        cascade="all, delete-orphan",
        order_by="AnnotationRevisionModel.revision_number.asc()",
    )


class AnnotationRevisionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "annotation_revisions"
    __table_args__ = (
        UniqueConstraint(
            "annotation_id",
            "revision_number",
            name="uq_annotation_revision_number",
        ),
    )

    annotation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("annotations.id", ondelete="CASCADE"),
        nullable=False,
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[str] = mapped_column(String(50), default="human", nullable=False)

    annotation: Mapped["AnnotationModel"] = relationship(
        "AnnotationModel", back_populates="revisions"
    )
    results: Mapped[list["AnnotationResultModel"]] = relationship(
        "AnnotationResultModel",
        back_populates="revision",
        cascade="all, delete-orphan",
    )


class AnnotationResultModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "annotation_results"

    revision_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("annotation_revisions.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    result_type: Mapped[str] = mapped_column(String(50), nullable=False)
    geometry: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    attributes: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    revision: Mapped["AnnotationRevisionModel"] = relationship(
        "AnnotationRevisionModel", back_populates="results"
    )
