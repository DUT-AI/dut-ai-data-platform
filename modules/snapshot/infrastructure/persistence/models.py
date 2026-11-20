from datetime import UTC, datetime
from typing import Any

from sqlalchemy import (
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


class SnapshotModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "snapshots"
    __table_args__ = (
        UniqueConstraint(
            "project_id", "version_name", name="uq_snapshots_project_version"
        ),
        Index("ix_snapshots_project_status", "project_id", "status"),
    )

    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    dataset_version_id: Mapped[str] = mapped_column(
        String(36), nullable=False, index=True
    )
    ontology_version_id: Mapped[str] = mapped_column(String(36), nullable=False)
    version_name: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20),
        server_default="CREATING",
        default="CREATING",
        nullable=False,
        index=True,
    )
    selection_policy: Mapped[str] = mapped_column(
        String(32),
        server_default="LATEST_APPROVED",
        default="LATEST_APPROVED",
        nullable=False,
    )
    include_unannotated: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    split_strategy: Mapped[str] = mapped_column(
        String(20), server_default="STRATIFIED", default="STRATIFIED", nullable=False
    )
    split_ratios: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    split_seed: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    finalized_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    items: Mapped[list["SnapshotItemModel"]] = relationship(
        "SnapshotItemModel",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )
    manifest: Mapped["SnapshotManifestModel | None"] = relationship(
        "SnapshotManifestModel",
        back_populates="snapshot",
        uselist=False,
        cascade="all, delete-orphan",
    )
    tags: Mapped[list["SnapshotTagModel"]] = relationship(
        "SnapshotTagModel",
        back_populates="snapshot",
        cascade="all, delete-orphan",
    )


class SnapshotItemModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "snapshot_items"
    __table_args__ = (
        UniqueConstraint("snapshot_id", "asset_id", name="uq_snapshot_item_asset"),
        Index("ix_snapshot_items_keyset", "snapshot_id", "id"),
        Index("ix_snapshot_items_split", "snapshot_id", "split"),
        Index("ix_snapshot_items_asset", "asset_id"),
    )

    snapshot_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False
    )
    asset_id: Mapped[str] = mapped_column(String(36), nullable=False)
    annotation_revision_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True
    )
    split: Mapped[str] = mapped_column(String(16), nullable=False)
    item_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    snapshot: Mapped["SnapshotModel"] = relationship(
        "SnapshotModel", back_populates="items"
    )


class SnapshotManifestModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "snapshot_manifests"

    snapshot_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("snapshots.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    dataset_version_id: Mapped[str] = mapped_column(String(36), nullable=False)
    ontology_version_id: Mapped[str] = mapped_column(String(36), nullable=False)
    asset_count: Mapped[int] = mapped_column(Integer, nullable=False)
    annotation_count: Mapped[int] = mapped_column(Integer, nullable=False)
    split_distribution: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    class_distribution: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    aggregate_checksum: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_uri: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    snapshot: Mapped["SnapshotModel"] = relationship(
        "SnapshotModel", back_populates="manifest"
    )


class SnapshotTagModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "snapshot_tags"
    __table_args__ = (
        UniqueConstraint("project_id", "name", name="uq_snapshot_tags_project_name"),
        Index("ix_snapshot_tags_snapshot", "snapshot_id"),
    )

    project_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    snapshot_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("snapshots.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    created_by: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    snapshot: Mapped["SnapshotModel"] = relationship(
        "SnapshotModel", back_populates="tags"
    )
