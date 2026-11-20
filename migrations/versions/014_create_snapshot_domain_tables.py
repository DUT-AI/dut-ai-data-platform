"""create snapshot domain tables

Revision ID: 014_create_snapshot_domain_tables
Revises: 013_create_workflow_domain_tables
Create Date: 2026-11-19
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "014_create_snapshot_domain_tables"
down_revision: str | None = "013_create_workflow_domain_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. snapshots
    op.create_table(
        "snapshots",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("dataset_version_id", sa.String(length=36), nullable=False),
        sa.Column("ontology_version_id", sa.String(length=36), nullable=False),
        sa.Column("version_name", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="CREATING"),
        sa.Column("selection_policy", sa.String(length=32), nullable=False, server_default="LATEST_APPROVED"),
        sa.Column("include_unannotated", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("split_strategy", sa.String(length=20), nullable=False, server_default="STRATIFIED"),
        sa.Column("split_ratios", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("split_seed", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "version_name", name="uq_snapshots_project_version"),
    )
    op.create_index("ix_snapshots_project_id", "snapshots", ["project_id"])
    op.create_index("ix_snapshots_dataset_version_id", "snapshots", ["dataset_version_id"])
    op.create_index("ix_snapshots_status", "snapshots", ["status"])
    op.create_index("ix_snapshots_project_status", "snapshots", ["project_id", "status"])

    # 2. snapshot_items
    op.create_table(
        "snapshot_items",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("snapshot_id", sa.String(length=26), nullable=False),
        sa.Column("asset_id", sa.String(length=36), nullable=False),
        sa.Column("annotation_revision_id", sa.String(length=36), nullable=True),
        sa.Column("split", sa.String(length=16), nullable=False),
        sa.Column("item_checksum", sa.String(length=64), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("snapshot_id", "asset_id", name="uq_snapshot_item_asset"),
    )
    op.create_index("ix_snapshot_items_keyset", "snapshot_items", ["snapshot_id", "id"])
    op.create_index("ix_snapshot_items_split", "snapshot_items", ["snapshot_id", "split"])
    op.create_index("ix_snapshot_items_asset", "snapshot_items", ["asset_id"])

    # 3. snapshot_manifests
    op.create_table(
        "snapshot_manifests",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("snapshot_id", sa.String(length=26), nullable=False),
        sa.Column("dataset_version_id", sa.String(length=36), nullable=False),
        sa.Column("ontology_version_id", sa.String(length=36), nullable=False),
        sa.Column("asset_count", sa.Integer(), nullable=False),
        sa.Column("annotation_count", sa.Integer(), nullable=False),
        sa.Column("split_distribution", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("class_distribution", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("aggregate_checksum", sa.String(length=64), nullable=False),
        sa.Column("storage_uri", sa.String(length=512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("snapshot_id", name="uq_snapshot_manifests_snapshot_id"),
    )

    # 4. snapshot_tags
    op.create_table(
        "snapshot_tags",
        sa.Column("id", sa.String(length=26), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("snapshot_id", sa.String(length=26), nullable=False),
        sa.Column("name", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "name", name="uq_snapshot_tags_project_name"),
    )
    op.create_index("ix_snapshot_tags_project_id", "snapshot_tags", ["project_id"])
    op.create_index("ix_snapshot_tags_snapshot", "snapshot_tags", ["snapshot_id"])


def downgrade() -> None:
    op.drop_table("snapshot_tags")
    op.drop_table("snapshot_manifests")
    op.drop_table("snapshot_items")
    op.drop_table("snapshots")
