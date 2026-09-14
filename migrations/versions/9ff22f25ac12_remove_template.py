"""remove template

Revision ID: 9ff22f25ac12
Revises: 012_unique_project_ontology
Create Date: 2026-09-14 21:13:14.372086

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9ff22f25ac12'
down_revision: Union[str, None] = '012_unique_project_ontology'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop foreign key constraints referencing catalog tables first
    op.drop_constraint(op.f('fk_projects_template_version'), 'projects', type_='foreignkey')
    op.drop_constraint(op.f('fk_projects_task_version'), 'projects', type_='foreignkey')

    # Drop child tables first in correct dependency order
    op.drop_table('template_provider_compatibilities')
    op.drop_table('project_template_versions')
    op.drop_table('project_templates')
    op.drop_index(op.f('ix_task_definition_versions_task'), table_name='task_definition_versions')
    op.drop_table('task_definition_versions')
    op.drop_index(op.f('ix_task_definitions_category'), table_name='task_definitions')
    op.drop_index(op.f('ix_task_definitions_key'), table_name='task_definitions')
    op.drop_table('task_definitions')
    op.alter_column('annotation_revisions', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.create_foreign_key(None, 'annotation_revisions', 'ontology_versions', ['ontology_version_id'], ['id'], ondelete='CASCADE')
    op.alter_column('annotations', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_constraint(op.f('annotations_ontology_version_id_fkey'), 'annotations', type_='foreignkey')
    op.create_foreign_key(None, 'annotations', 'ontology_versions', ['ontology_version_id'], ['id'], ondelete='SET NULL')
    op.alter_column('assets', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_index(op.f('ix_assets_project_sha256'), table_name='assets')
    op.create_index(op.f('ix_assets_sha256'), 'assets', ['sha256'], unique=False)
    op.create_unique_constraint('uq_project_sha256', 'assets', ['project_id', 'sha256'])
    op.execute("DELETE FROM categories WHERE ontology_id IS NULL")
    op.alter_column('categories', 'ontology_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               nullable=False)
    op.alter_column('categories', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('dataset_version_assets', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('dataset_versions', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_column('dataset_versions', 'label_studio_project_id')
    op.alter_column('datasets', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_index(op.f('ix_datasets_project_id'), table_name='datasets')
    op.drop_constraint(op.f('input_definitions_code_key'), 'input_definitions', type_='unique')
    op.drop_index(op.f('ix_input_definitions_code'), table_name='input_definitions')
    op.create_index(op.f('ix_input_definitions_code'), 'input_definitions', ['code'], unique=True)
    op.alter_column('ontologies', 'project_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontologies', 'current_version_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=True)
    op.alter_column('ontologies', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_index(op.f('ix_ontologies_project_id'), table_name='ontologies')
    op.create_index(op.f('ix_ontologies_project_id'), 'ontologies', ['project_id'], unique=True)
    op.alter_column('ontology_inputs', 'ontology_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_inputs', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_outputs', 'ontology_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_outputs', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_version_inputs', 'ontology_version_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_version_inputs', 'ontology_input_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_constraint(op.f('ontology_version_inputs_ontology_input_id_fkey'), 'ontology_version_inputs', type_='foreignkey')
    op.create_foreign_key(None, 'ontology_version_inputs', 'ontology_inputs', ['ontology_input_id'], ['id'], ondelete='RESTRICT')
    op.alter_column('ontology_version_output_categories', 'ontology_version_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_version_output_categories', 'ontology_output_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_version_output_categories', 'category_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_constraint(op.f('ontology_version_output_categories_category_id_fkey'), 'ontology_version_output_categories', type_='foreignkey')
    op.create_foreign_key(None, 'ontology_version_output_categories', 'categories', ['category_id'], ['id'], ondelete='RESTRICT')
    op.alter_column('ontology_version_outputs', 'ontology_version_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_version_outputs', 'ontology_output_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_version_outputs', 'ontology_input_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_constraint(op.f('ontology_version_outputs_ontology_input_id_fkey'), 'ontology_version_outputs', type_='foreignkey')
    op.drop_constraint(op.f('ontology_version_outputs_ontology_output_id_fkey'), 'ontology_version_outputs', type_='foreignkey')
    op.create_foreign_key(None, 'ontology_version_outputs', 'ontology_inputs', ['ontology_input_id'], ['id'], ondelete='RESTRICT')
    op.create_foreign_key(None, 'ontology_version_outputs', 'ontology_outputs', ['ontology_output_id'], ['id'], ondelete='RESTRICT')
    op.alter_column('ontology_versions', 'ontology_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.alter_column('ontology_versions', 'based_on_version_id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=True)
    op.alter_column('ontology_versions', 'status',
               existing_type=sa.VARCHAR(length=50),
               type_=sa.String(length=20),
               existing_nullable=False,
               existing_server_default=sa.text("'draft'::character varying"))
    op.alter_column('ontology_versions', 'id',
               existing_type=sa.VARCHAR(length=36),
               type_=sa.String(length=26),
               existing_nullable=False)
    op.drop_index(op.f('ix_ontology_versions_ontology_status'), table_name='ontology_versions')
    op.create_index(op.f('ix_ontology_versions_ontology_id'), 'ontology_versions', ['ontology_id'], unique=False)
    op.drop_constraint(op.f('outbox_events_event_id_key'), 'outbox_events', type_='unique')
    op.drop_constraint(op.f('output_definitions_code_key'), 'output_definitions', type_='unique')
    op.drop_index(op.f('ix_output_definitions_code'), table_name='output_definitions')
    op.create_index(op.f('ix_output_definitions_code'), 'output_definitions', ['code'], unique=True)
    op.alter_column('project_configurations', 'annotation_provider_key',
               existing_type=sa.VARCHAR(length=100),
               nullable=True,
               existing_server_default=sa.text("'label_studio'::character varying"))
    op.drop_column('project_members', 'created_at')
    op.drop_column('project_members', 'updated_at')
    op.alter_column('projects', 'task_definition_version_id',
               existing_type=sa.VARCHAR(length=26),
               type_=sa.String(length=255),
               existing_nullable=True)
    op.alter_column('projects', 'project_template_version_id',
               existing_type=sa.VARCHAR(length=26),
               type_=sa.String(length=255),
               existing_nullable=True)
    op.drop_index(op.f('ix_projects_created_by'), table_name='projects')
    op.drop_index(op.f('ix_projects_project_template_version_id'), table_name='projects')
    op.drop_index(op.f('ix_projects_status'), table_name='projects')
    op.drop_index(op.f('ix_projects_task_definition_version_id'), table_name='projects')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_foreign_key(op.f('fk_projects_task_version'), 'projects', 'task_definition_versions', ['task_definition_version_id'], ['id'])
    op.create_foreign_key(op.f('fk_projects_template_version'), 'projects', 'project_template_versions', ['project_template_version_id'], ['id'])
    op.create_index(op.f('ix_projects_task_definition_version_id'), 'projects', ['task_definition_version_id'], unique=False)
    op.create_index(op.f('ix_projects_status'), 'projects', ['status'], unique=False)
    op.create_index(op.f('ix_projects_project_template_version_id'), 'projects', ['project_template_version_id'], unique=False)
    op.create_index(op.f('ix_projects_created_by'), 'projects', ['created_by'], unique=False)
    op.alter_column('projects', 'project_template_version_id',
               existing_type=sa.String(length=255),
               type_=sa.VARCHAR(length=26),
               existing_nullable=True)
    op.alter_column('projects', 'task_definition_version_id',
               existing_type=sa.String(length=255),
               type_=sa.VARCHAR(length=26),
               existing_nullable=True)
    op.add_column('project_members', sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False))
    op.add_column('project_members', sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False))
    op.alter_column('project_configurations', 'annotation_provider_key',
               existing_type=sa.VARCHAR(length=100),
               nullable=False,
               existing_server_default=sa.text("'label_studio'::character varying"))
    op.drop_index(op.f('ix_output_definitions_code'), table_name='output_definitions')
    op.create_index(op.f('ix_output_definitions_code'), 'output_definitions', ['code'], unique=False)
    op.create_unique_constraint(op.f('output_definitions_code_key'), 'output_definitions', ['code'], postgresql_nulls_not_distinct=False)
    op.create_unique_constraint(op.f('outbox_events_event_id_key'), 'outbox_events', ['event_id'], postgresql_nulls_not_distinct=False)
    op.drop_index(op.f('ix_ontology_versions_ontology_id'), table_name='ontology_versions')
    op.create_index(op.f('ix_ontology_versions_ontology_status'), 'ontology_versions', ['ontology_id', 'status'], unique=False)
    op.alter_column('ontology_versions', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_versions', 'status',
               existing_type=sa.String(length=20),
               type_=sa.VARCHAR(length=50),
               existing_nullable=False,
               existing_server_default=sa.text("'draft'::character varying"))
    op.alter_column('ontology_versions', 'based_on_version_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('ontology_versions', 'ontology_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'ontology_version_outputs', type_='foreignkey')
    op.drop_constraint(None, 'ontology_version_outputs', type_='foreignkey')
    op.create_foreign_key(op.f('ontology_version_outputs_ontology_output_id_fkey'), 'ontology_version_outputs', 'ontology_outputs', ['ontology_output_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(op.f('ontology_version_outputs_ontology_input_id_fkey'), 'ontology_version_outputs', 'ontology_inputs', ['ontology_input_id'], ['id'], ondelete='CASCADE')
    op.alter_column('ontology_version_outputs', 'ontology_input_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_version_outputs', 'ontology_output_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_version_outputs', 'ontology_version_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'ontology_version_output_categories', type_='foreignkey')
    op.create_foreign_key(op.f('ontology_version_output_categories_category_id_fkey'), 'ontology_version_output_categories', 'categories', ['category_id'], ['id'], ondelete='CASCADE')
    op.alter_column('ontology_version_output_categories', 'category_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_version_output_categories', 'ontology_output_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_version_output_categories', 'ontology_version_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'ontology_version_inputs', type_='foreignkey')
    op.create_foreign_key(op.f('ontology_version_inputs_ontology_input_id_fkey'), 'ontology_version_inputs', 'ontology_inputs', ['ontology_input_id'], ['id'], ondelete='CASCADE')
    op.alter_column('ontology_version_inputs', 'ontology_input_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_version_inputs', 'ontology_version_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_outputs', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_outputs', 'ontology_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_inputs', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontology_inputs', 'ontology_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_index(op.f('ix_ontologies_project_id'), table_name='ontologies')
    op.create_index(op.f('ix_ontologies_project_id'), 'ontologies', ['project_id'], unique=False)
    op.alter_column('ontologies', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('ontologies', 'current_version_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=True)
    op.alter_column('ontologies', 'project_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_index(op.f('ix_input_definitions_code'), table_name='input_definitions')
    op.create_index(op.f('ix_input_definitions_code'), 'input_definitions', ['code'], unique=False)
    op.create_unique_constraint(op.f('input_definitions_code_key'), 'input_definitions', ['code'], postgresql_nulls_not_distinct=False)
    op.create_index(op.f('ix_datasets_project_id'), 'datasets', ['project_id'], unique=False)
    op.alter_column('datasets', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.add_column('dataset_versions', sa.Column('label_studio_project_id', sa.INTEGER(), autoincrement=False, nullable=True))
    op.alter_column('dataset_versions', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('dataset_version_assets', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('categories', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.alter_column('categories', 'ontology_id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               nullable=True)
    op.drop_constraint('uq_project_sha256', 'assets', type_='unique')
    op.drop_index(op.f('ix_assets_sha256'), table_name='assets')
    op.create_index(op.f('ix_assets_project_sha256'), 'assets', ['project_id', 'sha256'], unique=False)
    op.alter_column('assets', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'annotations', type_='foreignkey')
    op.create_foreign_key(op.f('annotations_ontology_version_id_fkey'), 'annotations', 'ontology_versions', ['ontology_version_id'], ['id'], ondelete='CASCADE')
    op.alter_column('annotations', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.drop_constraint(None, 'annotation_revisions', type_='foreignkey')
    op.alter_column('annotation_revisions', 'id',
               existing_type=sa.String(length=26),
               type_=sa.VARCHAR(length=36),
               existing_nullable=False)
    op.create_table('template_provider_compatibilities',
    sa.Column('id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('project_template_version_id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('provider_key', sa.VARCHAR(length=100), autoincrement=False, nullable=False),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'active'::character varying"), autoincrement=False, nullable=False),
    sa.Column('constraints', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['project_template_version_id'], ['project_template_versions.id'], name=op.f('template_provider_compatibilit_project_template_version_id_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('template_provider_compatibilities_pkey')),
    sa.UniqueConstraint('project_template_version_id', 'provider_key', name=op.f('template_provider_compatibili_project_template_version_id_p_key'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_table('project_templates',
    sa.Column('id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('key', sa.VARCHAR(length=120), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('task_definition_id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'active'::character varying"), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['task_definition_id'], ['task_definitions.id'], name=op.f('project_templates_task_definition_id_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('project_templates_pkey')),
    sa.UniqueConstraint('key', name=op.f('project_templates_key_key'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_table('task_definitions',
    sa.Column('id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('key', sa.VARCHAR(length=120), autoincrement=False, nullable=False),
    sa.Column('name', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.Column('description', sa.TEXT(), autoincrement=False, nullable=True),
    sa.Column('category', sa.VARCHAR(length=80), autoincrement=False, nullable=False),
    sa.Column('modality', sa.VARCHAR(length=80), autoincrement=False, nullable=False),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'active'::character varying"), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('task_definitions_pkey')),
    sa.UniqueConstraint('key', name=op.f('task_definitions_key_key'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_index(op.f('ix_task_definitions_key'), 'task_definitions', ['key'], unique=True)
    op.create_index(op.f('ix_task_definitions_category'), 'task_definitions', ['category'], unique=False)
    op.create_table('task_definition_versions',
    sa.Column('id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('task_definition_id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('version', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('input_schema', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), autoincrement=False, nullable=False),
    sa.Column('capability_schema', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), autoincrement=False, nullable=False),
    sa.Column('constraints', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), autoincrement=False, nullable=False),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'draft'::character varying"), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('published_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['task_definition_id'], ['task_definitions.id'], name=op.f('task_definition_versions_task_definition_id_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('task_definition_versions_pkey')),
    sa.UniqueConstraint('task_definition_id', 'version', name=op.f('task_definition_versions_task_definition_id_version_key'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    op.create_index(op.f('ix_task_definition_versions_task'), 'task_definition_versions', ['task_definition_id'], unique=False)
    op.create_table('project_template_versions',
    sa.Column('id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('project_template_id', sa.VARCHAR(length=26), autoincrement=False, nullable=False),
    sa.Column('version', sa.VARCHAR(length=50), autoincrement=False, nullable=False),
    sa.Column('default_project_configuration', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), autoincrement=False, nullable=False),
    sa.Column('ontology_template_ref', sa.VARCHAR(length=255), autoincrement=False, nullable=True),
    sa.Column('status', sa.VARCHAR(length=20), server_default=sa.text("'draft'::character varying"), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), autoincrement=False, nullable=False),
    sa.Column('published_at', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['project_template_id'], ['project_templates.id'], name=op.f('project_template_versions_project_template_id_fkey'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('project_template_versions_pkey')),
    sa.UniqueConstraint('project_template_id', 'version', name=op.f('project_template_versions_project_template_id_version_key'), postgresql_include=[], postgresql_nulls_not_distinct=False)
    )
    # ### end Alembic commands ###
