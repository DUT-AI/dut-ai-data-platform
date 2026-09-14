from dishka import Provider, Scope, provide

from modules.ontology.domain.interfaces import (
    ICategoryRepository,
    IInputDefinitionRepository,
    IOntologyInputRepository,
    IOntologyOutputRepository,
    IOntologyRepository,
    IOntologyVersionRepository,
    IOutputDefinitionRepository,
)
from modules.ontology.repository import (
    SqlCategoryRepository,
    SqlInputDefinitionRepository,
    SqlOntologyInputRepository,
    SqlOntologyOutputRepository,
    SqlOntologyRepository,
    SqlOntologyVersionRepository,
    SqlOutputDefinitionRepository,
)
from modules.ontology.use_cases import (
    CreateCategoryUseCase,
    CreateInputDefinitionUseCase,
    CreateOntologyInputUseCase,
    CreateOntologyOutputUseCase,
    CreateOntologyUseCase,
    CreateOntologyVersionUseCase,
    CreateOutputDefinitionUseCase,
    DeleteCategoryUseCase,
    DeleteInputDefinitionUseCase,
    DeleteOntologyInputUseCase,
    DeleteOntologyOutputUseCase,
    DeleteOntologyUseCase,
    DeleteOntologyVersionUseCase,
    DeleteOutputDefinitionUseCase,
    ExportOntologyVersionSchemaUseCase,
    GetCategoryUseCase,
    GetInputDefinitionUseCase,
    GetOntologyInputUseCase,
    GetOntologyOutputUseCase,
    GetOntologyUseCase,
    GetOntologyVersionUseCase,
    GetOutputDefinitionUseCase,
    GetProjectOntologyUseCase,
    ListCategoriesUseCase,
    ListInputDefinitionsUseCase,
    ListOntologyInputsUseCase,
    ListOntologyOutputsUseCase,
    ListOntologyVersionsUseCase,
    ListOutputDefinitionsUseCase,
    ListProjectOntologiesUseCase,
    PublishOntologyVersionUseCase,
    UpdateCategoryUseCase,
    UpdateInputDefinitionUseCase,
    UpdateOntologyCompositionUseCase,
    UpdateOntologyInputUseCase,
    UpdateOntologyOutputUseCase,
    UpdateOntologyUseCase,
    UpdateOntologyVersionUseCase,
    UpdateOutputDefinitionUseCase,
    ValidateOntologyVersionUseCase,
)


class OntologyProvider(Provider):
    scope = Scope.REQUEST

    ontology_repo = provide(SqlOntologyRepository, provides=IOntologyRepository)
    version_repo = provide(
        SqlOntologyVersionRepository, provides=IOntologyVersionRepository
    )
    input_definition_repo = provide(
        SqlInputDefinitionRepository, provides=IInputDefinitionRepository
    )
    output_definition_repo = provide(
        SqlOutputDefinitionRepository, provides=IOutputDefinitionRepository
    )
    input_repo = provide(SqlOntologyInputRepository, provides=IOntologyInputRepository)
    output_repo = provide(
        SqlOntologyOutputRepository, provides=IOntologyOutputRepository
    )
    category_repo = provide(SqlCategoryRepository, provides=ICategoryRepository)

    create_ontology = provide(CreateOntologyUseCase)
    list_ontologies = provide(ListProjectOntologiesUseCase)
    get_ontology = provide(GetOntologyUseCase)
    get_project_ontology = provide(GetProjectOntologyUseCase)
    update_ontology = provide(UpdateOntologyUseCase)
    delete_ontology = provide(DeleteOntologyUseCase)
    input_definitions = provide(ListInputDefinitionsUseCase)
    input_definition = provide(GetInputDefinitionUseCase)
    create_input_definition = provide(CreateInputDefinitionUseCase)
    update_input_definition = provide(UpdateInputDefinitionUseCase)
    delete_input_definition = provide(DeleteInputDefinitionUseCase)
    output_definitions = provide(ListOutputDefinitionsUseCase)
    output_definition = provide(GetOutputDefinitionUseCase)
    create_output_definition = provide(CreateOutputDefinitionUseCase)
    update_output_definition = provide(UpdateOutputDefinitionUseCase)
    delete_output_definition = provide(DeleteOutputDefinitionUseCase)
    list_inputs = provide(ListOntologyInputsUseCase)
    get_input = provide(GetOntologyInputUseCase)
    create_input = provide(CreateOntologyInputUseCase)
    update_input = provide(UpdateOntologyInputUseCase)
    delete_input = provide(DeleteOntologyInputUseCase)
    list_outputs = provide(ListOntologyOutputsUseCase)
    get_output = provide(GetOntologyOutputUseCase)
    create_output = provide(CreateOntologyOutputUseCase)
    update_output = provide(UpdateOntologyOutputUseCase)
    delete_output = provide(DeleteOntologyOutputUseCase)
    list_categories = provide(ListCategoriesUseCase)
    get_category = provide(GetCategoryUseCase)
    create_category = provide(CreateCategoryUseCase)
    update_category = provide(UpdateCategoryUseCase)
    delete_category = provide(DeleteCategoryUseCase)
    list_versions = provide(ListOntologyVersionsUseCase)
    get_version = provide(GetOntologyVersionUseCase)
    create_version = provide(CreateOntologyVersionUseCase)
    update_version = provide(UpdateOntologyVersionUseCase)
    update_composition = provide(UpdateOntologyCompositionUseCase)
    validate_version = provide(ValidateOntologyVersionUseCase)
    publish_version = provide(PublishOntologyVersionUseCase)
    export_version_schema = provide(ExportOntologyVersionSchemaUseCase)
    delete_version = provide(DeleteOntologyVersionUseCase)
