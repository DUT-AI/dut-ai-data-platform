"""create export domain tables

Revision ID: 015_create_export_domain_tables
Revises: 014_create_snapshot_domain_tables
Create Date: 2026-11-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "015_create_export_domain_tables"
down_revision: str | None = "014_create_snapshot_domain_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. export_packages
    op.create_table(
        "export_packages",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=26), nullable=False),
        sa.Column("format", sa.String(length=50), nullable=False),
        sa.Column("target_output_id", sa.String(length=36), nullable=True),
        sa.Column("media_mode", sa.String(length=20), nullable=False, server_default="labels_only"),
        sa.Column("annotated_only", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="processing"),
        sa.Column("storage_uri", sa.String(length=512), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=True),
        sa.Column("item_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.String(length=100), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "snapshot_id",
            "format",
            "target_output_id",
            "media_mode",
            "annotated_only",
            name="uq_export_package_idempotency",
        ),
    )
    op.create_index("ix_export_packages_project", "export_packages", ["project_id", "created_at"])
    op.create_index("ix_export_packages_snapshot", "export_packages", ["snapshot_id"])
    op.create_index("ix_export_packages_status", "export_packages", ["status"])

    # 2. export_items
    op.create_table(
        "export_items",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("export_package_id", sa.String(length=26), nullable=False),
        sa.Column("source_asset_id", sa.String(length=36), nullable=False),
        sa.Column("source_annotation_revision_id", sa.String(length=36), nullable=True),
        sa.Column("target_path", sa.String(length=512), nullable=False),
        sa.Column("split", sa.String(length=50), nullable=False, server_default="default"),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.ForeignKeyConstraint(["export_package_id"], ["export_packages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_export_items_package", "export_items", ["export_package_id"])
    op.create_index("ix_export_items_asset", "export_items", ["source_asset_id"])


def downgrade() -> None:
    op.drop_table("export_items")
    op.drop_table("export_packages")
