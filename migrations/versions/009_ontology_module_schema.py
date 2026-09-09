"""replace the legacy ontology schema with the final node composition model

Revision ID: 009_ontology_module_schema
Revises: 008_create_user_login_metadata
Create Date: 2026-09-08
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "009_ontology_module_schema"
down_revision: str | None = "008_create_user_login_metadata"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> tuple[sa.Column, sa.Column]:
    return (
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
    )


def upgrade() -> None:
    op.add_column("ontologies", sa.Column("current_version_id", sa.String(36)))
    op.drop_column("ontologies", "status")

    op.add_column("ontology_versions", sa.Column("version_no", sa.Integer()))
    op.add_column("ontology_versions", sa.Column("name", sa.String(255)))
    op.add_column("ontology_versions", sa.Column("based_on_version_id", sa.String(36)))
    op.add_column("ontology_versions", sa.Column("schema_hash", sa.String(80)))
    op.execute(
        "UPDATE ontology_versions SET version_no = COALESCE(NULLIF(regexp_replace(version, '[^0-9]', '', 'g'), '')::integer, 1)"
    )
    op.execute("UPDATE ontology_versions SET name = 'Version ' || version_no")
    op.execute(
        "UPDATE ontology_versions SET status = CASE WHEN lower(status) = 'published' THEN 'published' ELSE 'draft' END"
    )
    op.alter_column("ontology_versions", "version_no", nullable=False)
    op.alter_column("ontology_versions", "name", nullable=False)
    op.drop_constraint("uq_ontology_version", "ontology_versions", type_="unique")
    op.drop_column("ontology_versions", "version")
    op.create_unique_constraint(
        "uq_ontology_version_number", "ontology_versions", ["ontology_id", "version_no"]
    )
    op.create_check_constraint(
        "ck_ontology_version_status",
        "ontology_versions",
        "status IN ('draft', 'published')",
    )
    op.create_foreign_key(
        "ontology_versions_based_on_version_id_fkey",
        "ontology_versions",
        "ontology_versions",
        ["based_on_version_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.execute(
        "UPDATE ontologies SET current_version_id = latest.id FROM (SELECT DISTINCT ON (ontology_id) id, ontology_id FROM ontology_versions WHERE status = 'published' ORDER BY ontology_id, version_no DESC) latest WHERE latest.ontology_id = ontologies.id"
    )
    op.create_foreign_key(
        "ontologies_current_version_id_fkey",
        "ontologies",
        "ontology_versions",
        ["current_version_id"],
        ["id"],
        ondelete="SET NULL",
        use_alter=True,
    )

    op.create_table(
        "input_definitions",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("code", sa.String(60), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("allowed_formats", postgresql.JSONB(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_input_definitions_code", "input_definitions", ["code"])
    op.create_table(
        "output_definitions",
        sa.Column("id", sa.String(26), primary_key=True),
        sa.Column("code", sa.String(60), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("supports_categories", sa.Boolean(), nullable=False),
        sa.Column("default_schema", postgresql.JSONB(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_output_definitions_code", "output_definitions", ["code"])

    op.execute(
        sa.text("""
        INSERT INTO input_definitions (id, code, name, description, allowed_formats)
        VALUES
          ('01ONTINPUTIMAGE00000000000', 'image', 'Image', 'Một ảnh là dữ liệu đầu vào.', '["png","jpg","jpeg","webp","bmp"]'),
          ('01ONTINPUTTABLE00000000000', 'tabular', 'Tabular', 'Một file chứa nhiều bản ghi.', '["csv","xlsx","jsonl","parquet"]'),
          ('01ONTINPUTVIDEO00000000000', 'video', 'Video', 'Dữ liệu video.', '["mp4","webm","mov","avi"]'),
          ('01ONTINPUTAUDIO00000000000', 'audio', 'Audio', 'Dữ liệu âm thanh.', '["wav","mp3","flac","ogg"]'),
          ('01ONTINPUTDOC0000000000000', 'document', 'Document', 'Văn bản hoặc tài liệu.', '["txt","pdf","docx","md"]'),
          ('01ONTINPUTOBJECT0000000000', 'object', 'Object', 'Object JSON tự định nghĩa.', '["json","jsonl"]'),
          ('01ONTINPUTLINK000000000000', 'link', 'Link', 'Đường dẫn tới dữ liệu.', '["url"]')
    """)
    )
    op.execute(
        sa.text("""
        INSERT INTO output_definitions (id, code, name, description, supports_categories, default_schema)
        VALUES
          ('01ONTOUTCLASSIFY0000000000', 'classification', 'Classification', 'Chọn nhãn cho item.', true, '{"type":"string"}'),
          ('01ONTOUTBBOX00000000000000', 'bounding_box', 'Bounding Box', 'Hình chữ nhật trên ảnh.', true, '{"type":"object"}'),
          ('01ONTOUTPOLYGON00000000000', 'polygon', 'Polygon', 'Vùng đa giác.', true, '{"type":"object"}'),
          ('01ONTOUTTEXT00000000000000', 'text', 'Text', 'Kết quả văn bản.', false, '{"type":"string"}'),
          ('01ONTOUTNER000000000000000', 'named_entity', 'Named Entity', 'Thực thể trong văn bản.', true, '{"type":"object"}'),
          ('01ONTOUTRELATION0000000000', 'relation', 'Relation', 'Quan hệ giữa kết quả.', false, '{"type":"object"}'),
          ('01ONTOUTNUMBER000000000000', 'number', 'Number', 'Kết quả dạng số.', false, '{"type":"number"}'),
          ('01ONTOUTCUSTOM000000000000', 'custom_object', 'Custom Object', 'Object do người dùng định nghĩa.', false, '{"type":"object"}')
    """)
    )

    op.create_table(
        "ontology_inputs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ontology_id", sa.String(36), nullable=False),
        sa.Column("definition_id", sa.String(26), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("scope", sa.String(20), nullable=False),
        sa.Column("input_schema", postgresql.JSONB(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["ontology_id"], ["ontologies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["definition_id"], ["input_definitions.id"], ondelete="RESTRICT"
        ),
        sa.CheckConstraint(
            "scope IN ('ONE_ITEM','MANY_ITEMS')", name="ck_ontology_input_scope"
        ),
    )
    op.create_index(
        "ix_ontology_inputs_ontology_id", "ontology_inputs", ["ontology_id"]
    )
    op.create_table(
        "ontology_outputs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("ontology_id", sa.String(36), nullable=False),
        sa.Column("definition_id", sa.String(26), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("multiple", sa.Boolean(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False),
        sa.Column("value_schema", postgresql.JSONB()),
        *_timestamps(),
        sa.ForeignKeyConstraint(["ontology_id"], ["ontologies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["definition_id"], ["output_definitions.id"], ondelete="RESTRICT"
        ),
    )
    op.create_index(
        "ix_ontology_outputs_ontology_id", "ontology_outputs", ["ontology_id"]
    )

    op.add_column("categories", sa.Column("ontology_id", sa.String(36)))
    op.add_column("categories", sa.Column("key", sa.String(100)))
    op.execute(
        "UPDATE categories c SET ontology_id = v.ontology_id, key = left(lower(regexp_replace(c.name, '[^a-zA-Z0-9]+', '_', 'g')) || '_' || left(c.id, 6), 100), name = COALESCE(NULLIF(c.display_name, ''), c.name) FROM ontology_versions v WHERE v.id = c.ontology_version_id"
    )

    op.create_table(
        "ontology_version_inputs",
        sa.Column("ontology_version_id", sa.String(36), primary_key=True),
        sa.Column("ontology_input_id", sa.String(36), primary_key=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["ontology_version_id"], ["ontology_versions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["ontology_input_id"], ["ontology_inputs.id"], ondelete="RESTRICT"
        ),
    )
    op.create_table(
        "ontology_version_outputs",
        sa.Column("ontology_version_id", sa.String(36), primary_key=True),
        sa.Column("ontology_output_id", sa.String(36), primary_key=True),
        sa.Column("ontology_input_id", sa.String(36), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["ontology_version_id"], ["ontology_versions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["ontology_output_id"], ["ontology_outputs.id"], ondelete="RESTRICT"
        ),
        sa.ForeignKeyConstraint(
            ["ontology_input_id"], ["ontology_inputs.id"], ondelete="RESTRICT"
        ),
    )
    op.create_table(
        "ontology_version_output_categories",
        sa.Column("ontology_version_id", sa.String(36), primary_key=True),
        sa.Column("ontology_output_id", sa.String(36), primary_key=True),
        sa.Column("category_id", sa.String(36), primary_key=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["ontology_version_id", "ontology_output_id"],
            [
                "ontology_version_outputs.ontology_version_id",
                "ontology_version_outputs.ontology_output_id",
            ],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["category_id"], ["categories.id"], ondelete="RESTRICT"
        ),
    )

    op.execute(
        'INSERT INTO ontology_inputs (id, ontology_id, definition_id, name, scope, input_schema, created_at, updated_at) SELECT left(md5(\'input:\' || id), 26), ontology_id, \'01ONTINPUTIMAGE00000000000\', \'Image input\', \'ONE_ITEM\', \'{"type":"image","allowed_extensions":["png","jpg","jpeg"],"item":null}\', created_at, updated_at FROM ontology_versions'
    )
    op.execute(
        "INSERT INTO ontology_outputs (id, ontology_id, definition_id, name, multiple, required, created_at, updated_at) SELECT left(md5('output:' || id), 26), ontology_id, '01ONTOUTBBOX00000000000000', 'Annotation output', true, true, created_at, updated_at FROM ontology_versions"
    )
    op.execute(
        "INSERT INTO ontology_version_inputs SELECT id, left(md5('input:' || id), 26), 0 FROM ontology_versions"
    )
    op.execute(
        "INSERT INTO ontology_version_outputs SELECT id, left(md5('output:' || id), 26), left(md5('input:' || id), 26), 0 FROM ontology_versions"
    )
    op.execute(
        "INSERT INTO ontology_version_output_categories SELECT c.ontology_version_id, left(md5('output:' || c.ontology_version_id), 26), c.id, c.sort_order FROM categories c"
    )

    op.drop_table("attributes")
    op.drop_constraint(
        "categories_parent_category_id_fkey", "categories", type_="foreignkey"
    )
    op.drop_constraint(
        "categories_ontology_version_id_fkey", "categories", type_="foreignkey"
    )
    op.drop_constraint("uq_category_version_name", "categories", type_="unique")
    for column in (
        "ontology_version_id",
        "display_name",
        "parent_category_id",
        "sort_order",
    ):
        op.drop_column("categories", column)
    op.alter_column("categories", "ontology_id", nullable=False)
    op.alter_column("categories", "key", nullable=False)
    op.create_foreign_key(
        "categories_ontology_id_fkey",
        "categories",
        "ontologies",
        ["ontology_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_unique_constraint(
        "uq_category_ontology_key", "categories", ["ontology_id", "key"]
    )
    op.create_index("ix_categories_ontology_id", "categories", ["ontology_id"])


def downgrade() -> None:
    raise RuntimeError(
        "Migration này thay thế schema Ontology cũ; hãy phục hồi database backup để downgrade."
    )
