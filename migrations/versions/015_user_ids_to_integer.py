"""Convert user id columns to integer to match the models.

The backend refactor made every user identifier an integer (constitution II)
but no migration changed the columns, so queries such as
``projects.owner_id = $1::INTEGER`` fail with
``operator does not exist: character varying = integer``.

The cast fails loudly if a row holds a non-numeric id (for example legacy test
data such as ``user_test_id``); clean those rows first, there is no fallback.

Revision ID: 015_user_ids_to_integer
Revises: 014_create_snapshot_domain_tables
Create Date: 2026-11-20
"""

from collections.abc import Sequence

from alembic import op

revision: str = "015_user_ids_to_integer"
down_revision: str | None = "014_create_snapshot_domain_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (table, column, previous varchar length)
USER_ID_COLUMNS: list[tuple[str, str, int]] = [
    ("projects", "owner_id", 255),
    ("projects", "created_by", 255),
    ("project_members", "user_id", 255),
    ("annotations", "created_by", 255),
    ("annotation_revisions", "created_by", 255),
    ("assets", "created_by", 36),
    ("datasets", "created_by", 36),
    ("dataset_versions", "created_by", 36),
    ("user_login_metadata", "user_id", 255),
]


def upgrade() -> None:
    for table, column, _ in USER_ID_COLUMNS:
        op.execute(
            f'ALTER TABLE "{table}" ALTER COLUMN "{column}" '
            f'TYPE INTEGER USING "{column}"::integer'
        )


def downgrade() -> None:
    for table, column, length in reversed(USER_ID_COLUMNS):
        op.execute(
            f'ALTER TABLE "{table}" ALTER COLUMN "{column}" '
            f'TYPE VARCHAR({length}) USING "{column}"::text'
        )
