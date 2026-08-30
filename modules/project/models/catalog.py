from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database.base import Base, TimestampMixin, ULIDPrimaryKeyMixin


class TaskDefinitionModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "task_definitions"

    key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(80), index=True)
    modality: Mapped[str] = mapped_column(String(80), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)


class TaskDefinitionVersionModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "task_definition_versions"
    __table_args__ = (UniqueConstraint("task_definition_id", "version"),)

    task_definition_id: Mapped[str] = mapped_column(
        ForeignKey("task_definitions.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[str] = mapped_column(String(50))
    input_schema: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    capability_schema: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    constraints_payload: Mapped[dict[str, Any]] = mapped_column(
        "constraints", JSONB, default=dict
    )
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ProjectTemplateModel(Base, ULIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "project_templates"

    key: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    task_definition_id: Mapped[str] = mapped_column(
        ForeignKey("task_definitions.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)


class ProjectTemplateVersionModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "project_template_versions"
    __table_args__ = (UniqueConstraint("project_template_id", "version"),)

    project_template_id: Mapped[str] = mapped_column(
        ForeignKey("project_templates.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[str] = mapped_column(String(50))
    default_project_configuration: Mapped[dict[str, Any]] = mapped_column(
        JSONB, default=dict
    )
    ontology_template_ref: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(20), default="draft", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class TemplateProviderCompatibilityModel(Base, ULIDPrimaryKeyMixin):
    __tablename__ = "template_provider_compatibilities"
    __table_args__ = (UniqueConstraint("project_template_version_id", "provider_key"),)

    project_template_version_id: Mapped[str] = mapped_column(
        ForeignKey("project_template_versions.id", ondelete="CASCADE"), index=True
    )
    provider_key: Mapped[str] = mapped_column(String(100), index=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    constraints_payload: Mapped[dict[str, Any]] = mapped_column(
        "constraints", JSONB, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
