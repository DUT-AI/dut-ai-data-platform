from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database.base import BaseModel


class DatasetModel(BaseModel):
    __tablename__ = "datasets"

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    versions: Mapped[list["DatasetVersionModel"]] = relationship(
        "DatasetVersionModel", back_populates="dataset", cascade="all, delete-orphan"
    )


class DatasetVersionModel(BaseModel):
    __tablename__ = "dataset_versions"
    __table_args__ = (
        UniqueConstraint("dataset_id", "version", name="uq_dataset_version"),
    )

    dataset_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    asset_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    label_studio_project_id: Mapped[int | None] = mapped_column(Integer, nullable=True)

    dataset: Mapped["DatasetModel"] = relationship(
        "DatasetModel", back_populates="versions"
    )
    version_assets: Mapped[list["DatasetVersionAssetModel"]] = relationship(
        "DatasetVersionAssetModel",
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="DatasetVersionAssetModel.sort_order",
    )


class AssetModel(BaseModel):
    __tablename__ = "assets"

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    uri: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    asset_metadata: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata", JSONB, nullable=True
    )

    version_links: Mapped[list["DatasetVersionAssetModel"]] = relationship(
        "DatasetVersionAssetModel", back_populates="asset", cascade="all, delete-orphan"
    )


class DatasetVersionAssetModel(BaseModel):
    __tablename__ = "dataset_version_assets"
    __table_args__ = (
        UniqueConstraint("dataset_version_id", "asset_id", name="uq_version_asset"),
    )

    dataset_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("dataset_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    asset_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assets.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    version: Mapped["DatasetVersionModel"] = relationship(
        "DatasetVersionModel", back_populates="version_assets"
    )
    asset: Mapped["AssetModel"] = relationship(
        "AssetModel", back_populates="version_links"
    )
