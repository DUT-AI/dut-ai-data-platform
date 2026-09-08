from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin


class OntologyModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ontologies"

    project_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    current_version_id: Mapped[str | None] = mapped_column(
        String(26),
        ForeignKey("ontology_versions.id", ondelete="SET NULL", use_alter=True),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    versions: Mapped[list["OntologyVersionModel"]] = relationship(
        back_populates="ontology",
        cascade="all, delete-orphan",
        foreign_keys="OntologyVersionModel.ontology_id",
        order_by="OntologyVersionModel.version_no.asc()",
    )
    current_version: Mapped["OntologyVersionModel | None"] = relationship(
        foreign_keys=[current_version_id], post_update=True
    )


class InputDefinitionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "input_definitions"

    code: Mapped[str] = mapped_column(
        String(60), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    allowed_formats: Mapped[list[str]] = mapped_column(JSONB, nullable=False)


class OutputDefinitionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "output_definitions"

    code: Mapped[str] = mapped_column(
        String(60), unique=True, nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    supports_categories: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    default_schema: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)


class OntologyInputModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ontology_inputs"
    __table_args__ = (
        CheckConstraint(
            "scope IN ('ONE_ITEM', 'MANY_ITEMS')", name="ck_ontology_input_scope"
        ),
    )

    ontology_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontologies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    definition_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("input_definitions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    scope: Mapped[str] = mapped_column(String(20), nullable=False)
    input_schema: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    definition: Mapped[InputDefinitionModel] = relationship()


class OntologyOutputModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ontology_outputs"

    ontology_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontologies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    definition_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("output_definitions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    multiple: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    value_schema: Mapped[dict[str, Any] | None] = mapped_column(JSONB)

    definition: Mapped[OutputDefinitionModel] = relationship()


class CategoryModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "categories"
    __table_args__ = (
        UniqueConstraint("ontology_id", "key", name="uq_category_ontology_key"),
    )

    ontology_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontologies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str | None] = mapped_column(String(20))
    description: Mapped[str | None] = mapped_column(Text)


class OntologyVersionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "ontology_versions"
    __table_args__ = (
        UniqueConstraint(
            "ontology_id", "version_no", name="uq_ontology_version_number"
        ),
        CheckConstraint(
            "status IN ('draft', 'published')", name="ck_ontology_version_status"
        ),
    )

    ontology_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontologies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    based_on_version_id: Mapped[str | None] = mapped_column(
        String(26), ForeignKey("ontology_versions.id", ondelete="SET NULL")
    )
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    schema_hash: Mapped[str | None] = mapped_column(String(80))
    raw_label_config: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    ontology: Mapped[OntologyModel] = relationship(
        back_populates="versions", foreign_keys=[ontology_id]
    )
    input_links: Mapped[list["OntologyVersionInputModel"]] = relationship(
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="OntologyVersionInputModel.sort_order",
    )
    output_links: Mapped[list["OntologyVersionOutputModel"]] = relationship(
        back_populates="version",
        cascade="all, delete-orphan",
        order_by="OntologyVersionOutputModel.sort_order",
    )


class OntologyVersionInputModel(Base):
    __tablename__ = "ontology_version_inputs"

    ontology_version_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontology_versions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ontology_input_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontology_inputs.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    version: Mapped[OntologyVersionModel] = relationship(back_populates="input_links")
    input: Mapped[OntologyInputModel] = relationship()


class OntologyVersionOutputModel(Base):
    __tablename__ = "ontology_version_outputs"

    ontology_version_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontology_versions.id", ondelete="CASCADE"),
        primary_key=True,
    )
    ontology_output_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontology_outputs.id", ondelete="RESTRICT"),
        primary_key=True,
    )
    ontology_input_id: Mapped[str] = mapped_column(
        String(26),
        ForeignKey("ontology_inputs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    version: Mapped[OntologyVersionModel] = relationship(back_populates="output_links")
    output: Mapped[OntologyOutputModel] = relationship()
    input: Mapped[OntologyInputModel] = relationship()
    category_links: Mapped[list["OntologyVersionOutputCategoryModel"]] = relationship(
        back_populates="version_output",
        cascade="all, delete-orphan",
        order_by="OntologyVersionOutputCategoryModel.sort_order",
    )


class OntologyVersionOutputCategoryModel(Base):
    __tablename__ = "ontology_version_output_categories"
    __table_args__ = (
        ForeignKeyConstraint(
            ["ontology_version_id", "ontology_output_id"],
            [
                "ontology_version_outputs.ontology_version_id",
                "ontology_version_outputs.ontology_output_id",
            ],
            ondelete="CASCADE",
        ),
    )

    ontology_version_id: Mapped[str] = mapped_column(String(26), primary_key=True)
    ontology_output_id: Mapped[str] = mapped_column(String(26), primary_key=True)
    category_id: Mapped[str] = mapped_column(
        String(26), ForeignKey("categories.id", ondelete="RESTRICT"), primary_key=True
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    version_output: Mapped[OntologyVersionOutputModel] = relationship(
        back_populates="category_links"
    )
    category: Mapped[CategoryModel] = relationship()
