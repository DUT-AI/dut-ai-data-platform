# ruff: noqa: F401

from modules.ontology.use_cases.categories import (
    CreateCategoryUseCase,
    DeleteCategoryUseCase,
    GetCategoryUseCase,
    ListCategoriesUseCase,
    UpdateCategoryUseCase,
)
from modules.ontology.use_cases.definitions import (
    CreateInputDefinitionUseCase,
    CreateOutputDefinitionUseCase,
    DeleteInputDefinitionUseCase,
    DeleteOutputDefinitionUseCase,
    GetInputDefinitionUseCase,
    GetOutputDefinitionUseCase,
    ListInputDefinitionsUseCase,
    ListOutputDefinitionsUseCase,
    UpdateInputDefinitionUseCase,
    UpdateOutputDefinitionUseCase,
)
from modules.ontology.use_cases.inputs import (
    CreateOntologyInputUseCase,
    DeleteOntologyInputUseCase,
    GetOntologyInputUseCase,
    ListOntologyInputsUseCase,
    UpdateOntologyInputUseCase,
)
from modules.ontology.use_cases.ontologies import (
    CreateOntologyUseCase,
    DeleteOntologyUseCase,
    GetOntologyUseCase,
    GetProjectOntologyUseCase,
    ListProjectOntologiesUseCase,
    UpdateOntologyUseCase,
)
from modules.ontology.use_cases.outputs import (
    CreateOntologyOutputUseCase,
    DeleteOntologyOutputUseCase,
    GetOntologyOutputUseCase,
    ListOntologyOutputsUseCase,
    UpdateOntologyOutputUseCase,
)
from modules.ontology.use_cases.versions import (
    CreateOntologyVersionUseCase,
    DeleteOntologyVersionUseCase,
    ExportOntologyVersionSchemaUseCase,
    GetOntologyVersionUseCase,
    ListOntologyVersionsUseCase,
    PublishOntologyVersionUseCase,
    UpdateOntologyCompositionUseCase,
    UpdateOntologyVersionUseCase,
    ValidateOntologyVersionUseCase,
)

__all__ = [name for name in globals() if name.endswith(("UseCase", "UseCases"))]
