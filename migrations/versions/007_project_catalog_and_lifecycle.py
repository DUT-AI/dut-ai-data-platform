"""project catalog, templates and project lifecycle

Revision ID: 007_project_catalog_and_lifecycle
Revises: 5424e25876cf
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "007_project_catalog_and_lifecycle"
down_revision: str | None = "5424e25876cf"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task_definitions",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("key", sa.String(120), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("modality", sa.String(80), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index("ix_task_definitions_key", "task_definitions", ["key"], unique=True)
    op.create_index("ix_task_definitions_category", "task_definitions", ["category"])
    op.create_table(
        "task_definition_versions",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column(
            "task_definition_id",
            sa.String(26),
            sa.ForeignKey("task_definitions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.String(50), nullable=False),
        sa.Column(
            "input_schema", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column(
            "capability_schema", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column(
            "constraints", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("task_definition_id", "version"),
    )
    op.create_index(
        "ix_task_definition_versions_task",
        "task_definition_versions",
        ["task_definition_id"],
    )
    op.create_table(
        "project_templates",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("key", sa.String(120), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column(
            "task_definition_id",
            sa.String(26),
            sa.ForeignKey("task_definitions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_table(
        "project_template_versions",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column(
            "project_template_id",
            sa.String(26),
            sa.ForeignKey("project_templates.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.String(50), nullable=False),
        sa.Column(
            "default_project_configuration",
            postgresql.JSONB(),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("ontology_template_ref", sa.String(255)),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column("published_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("project_template_id", "version"),
    )
    op.create_table(
        "template_provider_compatibilities",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column(
            "project_template_version_id",
            sa.String(26),
            sa.ForeignKey("project_template_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider_key", sa.String(100), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "constraints", postgresql.JSONB(), nullable=False, server_default="{}"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("project_template_version_id", "provider_key"),
    )
    op.add_column("projects", sa.Column("created_by", sa.String(255), nullable=True))
    op.add_column(
        "projects",
        sa.Column("task_definition_version_id", sa.String(26), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column("project_template_version_id", sa.String(26), nullable=True),
    )
    op.add_column("projects", sa.Column("archived_at", sa.DateTime(timezone=True)))
    op.create_foreign_key(
        "fk_projects_task_version",
        "projects",
        "task_definition_versions",
        ["task_definition_version_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_projects_template_version",
        "projects",
        "project_template_versions",
        ["project_template_version_id"],
        ["id"],
    )
    op.create_index("ix_projects_created_by", "projects", ["created_by"])
    op.create_index(
        "ix_projects_task_definition_version_id",
        "projects",
        ["task_definition_version_id"],
    )
    op.create_index(
        "ix_projects_project_template_version_id",
        "projects",
        ["project_template_version_id"],
    )
    op.create_index("ix_projects_status", "projects", ["status"])
    op.execute("UPDATE projects SET created_by = owner_id WHERE created_by IS NULL")
    op.alter_column("projects", "created_by", nullable=False)
    op.alter_column("projects", "project_type", nullable=True)
    op.add_column(
        "project_configurations",
        sa.Column(
            "annotation_provider_key",
            sa.String(100),
            nullable=False,
            server_default="label_studio",
        ),
    )
    op.add_column(
        "project_configurations",
        sa.Column(
            "storage_provider_key",
            sa.String(100),
            nullable=False,
            server_default="minio",
        ),
    )
    op.add_column(
        "project_configurations", sa.Column("default_workflow_ref", sa.String(255))
    )
    op.add_column(
        "project_configurations",
        sa.Column(
            "settings_schema_version",
            sa.String(20),
            nullable=False,
            server_default="1.0",
        ),
    )


def downgrade() -> None:
    for column in [
        "settings_schema_version",
        "default_workflow_ref",
        "storage_provider_key",
        "annotation_provider_key",
    ]:
        op.drop_column("project_configurations", column)
    op.drop_index("ix_projects_status", table_name="projects")
    op.drop_index("ix_projects_project_template_version_id", table_name="projects")
    op.drop_index("ix_projects_task_definition_version_id", table_name="projects")
    op.drop_index("ix_projects_created_by", table_name="projects")
    op.drop_constraint("fk_projects_template_version", "projects", type_="foreignkey")
    op.drop_constraint("fk_projects_task_version", "projects", type_="foreignkey")
    for column in [
        "archived_at",
        "project_template_version_id",
        "task_definition_version_id",
        "created_by",
    ]:
        op.drop_column("projects", column)
    op.drop_table("template_provider_compatibilities")
    op.drop_table("project_template_versions")
    op.drop_table("project_templates")
    op.drop_table("task_definition_versions")
    op.drop_table("task_definitions")
