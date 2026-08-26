"""add label_studio_project_id to dataset_versions

Revision ID: 005_add_label_studio_project_id
Revises: 004_annotation_domain_tables
Create Date: 2026-07-29

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "005_add_label_studio_project_id"
down_revision: str | None = "004_annotation_domain_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "dataset_versions",
        sa.Column("label_studio_project_id", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("dataset_versions", "label_studio_project_id")
