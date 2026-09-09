from sqlalchemy.orm import selectinload

from modules.ontology.domain.entities import (
    CategoryEntity,
    InputDefinitionEntity,
    OntologyEntity,
    OntologyInputEntity,
    OntologyOutputEntity,
    OntologyVersionEntity,
    OntologyVersionInputEntity,
    OntologyVersionOutputCategoryEntity,
    OntologyVersionOutputEntity,
    OutputDefinitionEntity,
)
from modules.ontology.models import (
    CategoryModel,
    InputDefinitionModel,
    OntologyInputModel,
    OntologyModel,
    OntologyOutputModel,
    OntologyVersionInputModel,
    OntologyVersionModel,
    OntologyVersionOutputCategoryModel,
    OntologyVersionOutputModel,
    OutputDefinitionModel,
)


def map_input_definition(model: InputDefinitionModel) -> InputDefinitionEntity:
    return InputDefinitionEntity(
        id=model.id,
        code=model.code,
        name=model.name,
        description=model.description,
        allowed_formats=list(model.allowed_formats),
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def map_output_definition(model: OutputDefinitionModel) -> OutputDefinitionEntity:
    return OutputDefinitionEntity(
        id=model.id,
        code=model.code,
        name=model.name,
        description=model.description,
        supports_categories=model.supports_categories,
        default_schema=model.default_schema,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def map_input(model: OntologyInputModel) -> OntologyInputEntity:
    return OntologyInputEntity(
        id=model.id,
        ontology_id=model.ontology_id,
        definition_id=model.definition_id,
        name=model.name,
        description=model.description,
        scope=model.scope,
        input_schema=model.input_schema,
        definition=map_input_definition(model.definition) if model.definition else None,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def map_output(model: OntologyOutputModel) -> OntologyOutputEntity:
    return OntologyOutputEntity(
        id=model.id,
        ontology_id=model.ontology_id,
        definition_id=model.definition_id,
        name=model.name,
        description=model.description,
        multiple=model.multiple,
        required=model.required,
        value_schema=model.value_schema,
        definition=map_output_definition(model.definition)
        if model.definition
        else None,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def map_category(model: CategoryModel) -> CategoryEntity:
    return CategoryEntity(
        id=model.id,
        ontology_id=model.ontology_id,
        key=model.key,
        name=model.name,
        color=model.color,
        description=model.description,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def map_version(model: OntologyVersionModel) -> OntologyVersionEntity:
    return OntologyVersionEntity(
        id=model.id,
        ontology_id=model.ontology_id,
        version_no=model.version_no,
        name=model.name,
        status=model.status,
        based_on_version_id=model.based_on_version_id,
        schema_hash=model.schema_hash,
        raw_label_config=model.raw_label_config,
        published_at=model.published_at,
        inputs=[
            OntologyVersionInputEntity(
                ontology_version_id=link.ontology_version_id,
                ontology_input_id=link.ontology_input_id,
                sort_order=link.sort_order,
                input=map_input(link.input),
            )
            for link in model.input_links
        ],
        outputs=[
            OntologyVersionOutputEntity(
                ontology_version_id=link.ontology_version_id,
                ontology_output_id=link.ontology_output_id,
                ontology_input_id=link.ontology_input_id,
                sort_order=link.sort_order,
                output=map_output(link.output),
                input=map_input(link.input),
                categories=[
                    OntologyVersionOutputCategoryEntity(
                        ontology_version_id=item.ontology_version_id,
                        ontology_output_id=item.ontology_output_id,
                        category_id=item.category_id,
                        sort_order=item.sort_order,
                        category=map_category(item.category),
                    )
                    for item in link.category_links
                ],
            )
            for link in model.output_links
        ],
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def map_ontology(model: OntologyModel) -> OntologyEntity:
    return OntologyEntity(
        id=model.id,
        project_id=model.project_id,
        name=model.name,
        description=model.description,
        current_version_id=model.current_version_id,
        versions=[map_version(item) for item in model.versions],
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def version_load_options():
    return (
        selectinload(OntologyVersionModel.input_links)
        .selectinload(OntologyVersionInputModel.input)
        .selectinload(OntologyInputModel.definition),
        selectinload(OntologyVersionModel.output_links)
        .selectinload(OntologyVersionOutputModel.output)
        .selectinload(OntologyOutputModel.definition),
        selectinload(OntologyVersionModel.output_links)
        .selectinload(OntologyVersionOutputModel.input)
        .selectinload(OntologyInputModel.definition),
        selectinload(OntologyVersionModel.output_links)
        .selectinload(OntologyVersionOutputModel.category_links)
        .selectinload(OntologyVersionOutputCategoryModel.category),
    )
