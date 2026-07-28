from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
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


class OntologyModel(BaseModel):
    __tablename__ = "ontologies"

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    versions: Mapped[list["OntologyVersionModel"]] = relationship(
        "OntologyVersionModel", back_populates="ontology", cascade="all, delete-orphan"
    )


class OntologyVersionModel(BaseModel):
    __tablename__ = "ontology_versions"
    __table_args__ = (
        UniqueConstraint("ontology_id", "version", name="uq_ontology_version"),
    )

    ontology_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("ontologies.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    ontology: Mapped["OntologyModel"] = relationship(
        "OntologyModel", back_populates="versions"
    )
    categories: Mapped[list["CategoryModel"]] = relationship(
        "CategoryModel",
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="CategoryModel.sort_order",
    )


class CategoryModel(BaseModel):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint(
            "ontology_version_id", "name", name="uq_category_version_name"
        ),
    )

    ontology_version_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("ontology_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str] = mapped_column(String(36), default="#3B82F6", nullable=False)
    parent_category_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    version: Mapped["OntologyVersionModel"] = relationship(
        "OntologyVersionModel", back_populates="categories"
    )
    attributes: Mapped[list["AttributeModel"]] = relationship(
        "AttributeModel", back_populates="category", cascade="all, delete-orphan"
    )


class AttributeModel(BaseModel):
    __tablename__ = "attributes"
    __table_args__ = (
        UniqueConstraint("category_id", "name", name="uq_attribute_category_name"),
    )

    category_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    allowed_values: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(
        JSONB, nullable=True
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped["CategoryModel"] = relationship(
        "CategoryModel", back_populates="attributes"
    )
