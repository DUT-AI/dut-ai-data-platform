"""create workflow domain tables

Revision ID: 013_create_workflow_domain_tables
Revises: 9ff22f25ac12
Create Date: 2026-11-04
"""

from collections.abc import Sequence
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "013_create_workflow_domain_tables"
down_revision: str | None = "9ff22f25ac12"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. workflow_definitions
    op.create_table(
        "workflow_definitions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("config", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workflow_definitions_project_id", "workflow_definitions", ["project_id"])

    # 2. work_items
    op.create_table(
        "work_items",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("workflow_id", sa.String(length=36), nullable=False),
        sa.Column("project_id", sa.String(length=36), nullable=False),
        sa.Column("resource_type", sa.String(length=64), nullable=False),
        sa.Column("resource_id", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="CREATED"),
        sa.Column("priority", sa.String(length=16), nullable=False, server_default="MEDIUM"),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["workflow_id"], ["workflow_definitions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_work_items_workflow_id", "work_items", ["workflow_id"])
    op.create_index("ix_work_items_project_id", "work_items", ["project_id"])
    op.create_index("ix_work_items_resource_type", "work_items", ["resource_type"])
    op.create_index("ix_work_items_resource_id", "work_items", ["resource_id"])
    op.create_index("ix_work_items_status", "work_items", ["status"])

    # 3. workflow_assignments
    op.create_table(
        "workflow_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("work_item_id", sa.String(length=36), nullable=False),
        sa.Column("assignee_id", sa.Integer(), nullable=False),
        sa.Column("assigned_by", sa.Integer(), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("priority", sa.String(length=16), nullable=False, server_default="MEDIUM"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workflow_assignments_work_item_id", "workflow_assignments", ["work_item_id"])
    op.create_index("ix_workflow_assignments_assignee_id", "workflow_assignments", ["assignee_id"])

    # 4. workflow_history
    op.create_table(
        "workflow_history",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("work_item_id", sa.String(length=36), nullable=False),
        sa.Column("from_state", sa.String(length=32), nullable=False),
        sa.Column("to_state", sa.String(length=32), nullable=False),
        sa.Column("changed_by", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="{}"),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["work_item_id"], ["work_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_workflow_history_work_item_id", "workflow_history", ["work_item_id"])
    op.create_index("ix_workflow_history_changed_at", "workflow_history", ["changed_at"])


def downgrade() -> None:
    op.drop_table("workflow_history")
    op.drop_table("workflow_assignments")
    op.drop_table("work_items")
    op.drop_table("workflow_definitions")

