"""add label_studio_task_id to annotations

Revision ID: 006_add_label_studio_task_id
Revises: 005_add_label_studio_project_id
Create Date: 2026-07-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "006_add_label_studio_task_id"
down_revision: str | None = "005_add_label_studio_project_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "annotations",
        sa.Column("label_studio_task_id", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("annotations", "label_studio_task_id")
