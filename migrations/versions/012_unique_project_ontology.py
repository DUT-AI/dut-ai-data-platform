"""add unique constraint on ontologies project_id

Revision ID: 012_unique_project_ontology
Revises: 011_refactor_annotation_target_and_results
Create Date: 2026-09-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "012_unique_project_ontology"
down_revision: str | None = "011_refactor_annotation_target_and_results"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 1. First, make foreign keys from version outputs/inputs to nodes CASCADE so deleting an ontology cascades cleanly
    op.drop_constraint(
        "ontology_version_output_categories_category_id_fkey",
        "ontology_version_output_categories",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "ontology_version_output_categories_category_id_fkey",
        "ontology_version_output_categories",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "ontology_version_outputs_ontology_output_id_fkey",
        "ontology_version_outputs",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "ontology_version_outputs_ontology_output_id_fkey",
        "ontology_version_outputs",
        "ontology_outputs",
        ["ontology_output_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "ontology_version_outputs_ontology_input_id_fkey",
        "ontology_version_outputs",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "ontology_version_outputs_ontology_input_id_fkey",
        "ontology_version_outputs",
        "ontology_inputs",
        ["ontology_input_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint(
        "ontology_version_inputs_ontology_input_id_fkey",
        "ontology_version_inputs",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "ontology_version_inputs_ontology_input_id_fkey",
        "ontology_version_inputs",
        "ontology_inputs",
        ["ontology_input_id"],
        ["id"],
        ondelete="CASCADE",
    )

    # 2. Clean up duplicate ontologies if any, keeping the latest or the one with current_version_id
    op.execute(
        sa.text("""
        DELETE FROM ontologies
        WHERE id IN (
            SELECT id FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                           PARTITION BY project_id 
                           ORDER BY 
                               (CASE WHEN current_version_id IS NOT NULL THEN 1 ELSE 0 END) DESC,
                               created_at DESC
                       ) as rn
                FROM ontologies
            ) sub
            WHERE sub.rn > 1
        );
    """)
    )

    # 3. Add unique constraint if not present
    uqs = [u["name"] for u in inspector.get_unique_constraints("ontologies")]
    if "uq_ontologies_project_id" not in uqs:
        op.create_unique_constraint(
            "uq_ontologies_project_id", "ontologies", ["project_id"]
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    uqs = [u["name"] for u in inspector.get_unique_constraints("ontologies")]
    if "uq_ontologies_project_id" in uqs:
        op.drop_constraint("uq_ontologies_project_id", "ontologies", type_="unique")
