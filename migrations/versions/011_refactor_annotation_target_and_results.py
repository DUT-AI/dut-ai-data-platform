"""refactor annotation domain to target selector and inlined results

Revision ID: 011_refactor_annotation_target_and_results
Revises: 010_create_outbox_events_table, 009_ontology_module_schema
Create Date: 2026-09-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "011_refactor_annotation_target_and_results"
down_revision: tuple[str, str] = (
    "010_create_outbox_events_table",
    "009_ontology_module_schema",
)
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    # 1. Update annotations table
    if "annotations" in table_names:
        cols = [c["name"] for c in inspector.get_columns("annotations")]
        if "target_type" not in cols:
            op.add_column(
                "annotations",
                sa.Column(
                    "target_type",
                    sa.String(length=50),
                    server_default="FULL_ASSET",
                    nullable=False,
                ),
            )
        if "target_selector" not in cols:
            op.add_column(
                "annotations",
                sa.Column(
                    "target_selector",
                    postgresql.JSONB(astext_type=sa.Text()),
                    server_default=sa.text("'{}'::jsonb"),
                    nullable=False,
                ),
            )
        # Drop old unique constraint if present
        uqs = [u["name"] for u in inspector.get_unique_constraints("annotations")]
        if "uq_asset_ontology_version" in uqs:
            op.drop_constraint("uq_asset_ontology_version", "annotations", type_="unique")

        # Make ontology_version_id nullable on annotations if it is not
        op.alter_column(
            "annotations", "ontology_version_id", existing_type=sa.String(36), nullable=True
        )

        # Create GIN index on target_selector
        indexes = [idx["name"] for idx in inspector.get_indexes("annotations")]
        if "ix_annotations_target_selector" not in indexes:
            op.create_index(
                "ix_annotations_target_selector",
                "annotations",
                ["target_selector"],
                unique=False,
                postgresql_using="gin",
            )
        if "ix_annotations_project_id" not in indexes:
            op.create_index("ix_annotations_project_id", "annotations", ["project_id"], unique=False)

    # 2. Update annotation_revisions table
    if "annotation_revisions" in table_names:
        rev_cols = [c["name"] for c in inspector.get_columns("annotation_revisions")]
        if "ontology_version_id" not in rev_cols:
            # Backfill from parent annotations table
            op.add_column(
                "annotation_revisions",
                sa.Column("ontology_version_id", sa.String(length=36), nullable=True),
            )
            op.execute(
                """
                UPDATE annotation_revisions r
                SET ontology_version_id = a.ontology_version_id
                FROM annotations a
                WHERE r.annotation_id = a.id AND a.ontology_version_id IS NOT NULL;
                """
            )
            # Default empty strings or placeholder if any remain
            op.execute(
                """
                UPDATE annotation_revisions
                SET ontology_version_id = 'default'
                WHERE ontology_version_id IS NULL;
                """
            )
            op.alter_column(
                "annotation_revisions", "ontology_version_id", nullable=False
            )

        if "results" not in rev_cols:
            op.add_column(
                "annotation_revisions",
                sa.Column(
                    "results",
                    postgresql.JSONB(astext_type=sa.Text()),
                    server_default=sa.text("'[]'::jsonb"),
                    nullable=False,
                ),
            )
        if "category_ids" not in rev_cols:
            op.add_column(
                "annotation_revisions",
                sa.Column(
                    "category_ids",
                    postgresql.JSONB(astext_type=sa.Text()),
                    server_default=sa.text("'[]'::jsonb"),
                    nullable=False,
                ),
            )

        # Migrate data from annotation_results if table exists
        if "annotation_results" in table_names:
            op.execute(
                """
                UPDATE annotation_revisions r
                SET results = COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', ar.id,
                                'result_type', ar.result_type,
                                'category_id', ar.category_id,
                                'geometry', ar.geometry,
                                'payload', ar.payload,
                                'attributes', ar.attributes
                            )
                        )
                        FROM annotation_results ar
                        WHERE ar.revision_id = r.id
                    ),
                    '[]'::jsonb
                ),
                category_ids = COALESCE(
                    (
                        SELECT jsonb_agg(DISTINCT ar.category_id)
                        FROM annotation_results ar
                        WHERE ar.revision_id = r.id AND ar.category_id IS NOT NULL
                    ),
                    '[]'::jsonb
                );
                """
            )

        rev_indexes = [idx["name"] for idx in inspector.get_indexes("annotation_revisions")]
        if "ix_annotation_revisions_results" not in rev_indexes:
            op.create_index(
                "ix_annotation_revisions_results",
                "annotation_revisions",
                ["results"],
                unique=False,
                postgresql_using="gin",
            )
        if "ix_annotation_revisions_category_ids" not in rev_indexes:
            op.create_index(
                "ix_annotation_revisions_category_ids",
                "annotation_revisions",
                ["category_ids"],
                unique=False,
                postgresql_using="gin",
            )

    # 3. Drop legacy annotation_results table
    if "annotation_results" in table_names:
        op.drop_table("annotation_results")


def downgrade() -> None:
    # Downgrade recreation of annotation_results if rolled back
    op.create_table(
        "annotation_results",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("revision_id", sa.String(length=36), nullable=False),
        sa.Column("category_id", sa.String(length=36), nullable=True),
        sa.Column("result_type", sa.String(length=50), nullable=False),
        sa.Column("geometry", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("attributes", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["revision_id"], ["annotation_revisions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.drop_index("ix_annotation_revisions_category_ids", table_name="annotation_revisions")
    op.drop_index("ix_annotation_revisions_results", table_name="annotation_revisions")
    op.drop_column("annotation_revisions", "category_ids")
    op.drop_column("annotation_revisions", "results")
    op.drop_column("annotation_revisions", "ontology_version_id")
    op.drop_index("ix_annotations_project_id", table_name="annotations")
    op.drop_index("ix_annotations_target_selector", table_name="annotations")
    op.drop_column("annotations", "target_selector")
    op.drop_column("annotations", "target_type")
