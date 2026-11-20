from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database.base import Base, ULIDPrimaryKeyMixin


class ExportPackageModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "export_packages"
    __table_args__ = (
        UniqueConstraint(
            "snapshot_id",
            "format",
            "target_output_id",
            "media_mode",
            "annotated_only",
            name="uq_export_package_idempotency",
        ),
        Index("ix_export_packages_project", "project_id", "created_at"),
        Index("ix_export_packages_snapshot", "snapshot_id"),
        Index("ix_export_packages_status", "status"),
    )

    project_id: Mapped[str] = mapped_column(String(36), nullable=False)
    snapshot_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False
    )
    format: Mapped[str] = mapped_column(String(50), nullable=False)
    target_output_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    media_mode: Mapped[str] = mapped_column(
        String(20), server_default="labels_only", default="labels_only", nullable=False
    )
    annotated_only: Mapped[bool] = mapped_column(
        Boolean, server_default="false", default=False, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), server_default="processing", default="processing", nullable=False
    )
    storage_uri: Mapped[str | None] = mapped_column(String(512), nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(64), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    item_count: Mapped[int] = mapped_column(
        Integer, server_default="0", default=0, nullable=False
    )
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    finalized_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    items: Mapped[list["ExportItemModel"]] = relationship(
        "ExportItemModel",
        back_populates="package",
        cascade="all, delete-orphan",
    )


class ExportItemModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "export_items"
    __table_args__ = (
        Index("ix_export_items_package", "export_package_id"),
        Index("ix_export_items_asset", "source_asset_id"),
    )

    export_package_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("export_packages.id", ondelete="CASCADE"),
        nullable=False,
    )
    source_asset_id: Mapped[str] = mapped_column(String(36), nullable=False)
    source_annotation_revision_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )
    target_path: Mapped[str] = mapped_column(String(512), nullable=False)
    split: Mapped[str] = mapped_column(
        String(50), server_default="default", default="default", nullable=False
    )
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, server_default="{}", default=dict, nullable=False
    )

    package: Mapped[ExportPackageModel] = relationship(
        "ExportPackageModel", back_populates="items"
    )
