"""update dataset domain tables with spec v1 fields

Revision ID: 009_update_dataset_domain_tables
Revises: 008_create_user_login_metadata
Create Date: 2026-09-08

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "009_update_dataset_domain_tables"
down_revision: str | None = "008_create_user_login_metadata"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. datasets
    op.add_column(
        "datasets",
        sa.Column("tags", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "datasets",
        sa.Column("latest_published_version_number", sa.Integer(), nullable=True),
    )
    op.add_column(
        "datasets",
        sa.Column("created_by", sa.String(length=36), nullable=True),
    )

    # 2. dataset_versions
    op.add_column(
        "dataset_versions",
        sa.Column("version_number", sa.Integer(), nullable=True),
    )
    op.add_column(
        "dataset_versions",
        sa.Column("version_label", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "dataset_versions",
        sa.Column("parent_version_id", sa.String(length=36), nullable=True),
    )
    op.create_foreign_key(
        "fk_dataset_versions_parent_version",
        "dataset_versions",
        "dataset_versions",
        ["parent_version_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column(
        "dataset_versions",
        sa.Column("version_config", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "dataset_versions",
        sa.Column("manifest_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "dataset_versions",
        sa.Column("created_by", sa.String(length=36), nullable=True),
    )

    # 3. assets
    op.add_column(
        "assets",
        sa.Column("data_format", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "assets",
        sa.Column(
            "status", sa.String(length=50), server_default="READY", nullable=False
        ),
    )
    op.add_column(
        "assets",
        sa.Column("provenance", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "assets",
        sa.Column("created_by", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "assets",
        sa.Column("retired_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    # 3. assets
    op.drop_column("assets", "retired_at")
    op.drop_column("assets", "created_by")
    op.drop_column("assets", "provenance")
    op.drop_column("assets", "status")
    op.drop_column("assets", "data_format")

    # 2. dataset_versions
    op.drop_column("dataset_versions", "created_by")
    op.drop_column("dataset_versions", "manifest_hash")
    op.drop_column("dataset_versions", "version_config")
    op.drop_constraint(
        "fk_dataset_versions_parent_version", "dataset_versions", type_="foreignkey"
    )
    op.drop_column("dataset_versions", "parent_version_id")
    op.drop_column("dataset_versions", "version_label")
    op.drop_column("dataset_versions", "version_number")

    # 1. datasets
    op.drop_column("datasets", "created_by")
    op.drop_column("datasets", "latest_published_version_number")
    op.drop_column("datasets", "tags")
