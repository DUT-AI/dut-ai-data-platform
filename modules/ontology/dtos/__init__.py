# ruff: noqa: F401

from modules.ontology.dtos.ontology_dtos import (
    CategoryCreateDTO,
    CategoryResponseDTO,
    CategoryUpdateDTO,
    InputDefinitionCreateDTO,
    InputDefinitionResponseDTO,
    InputDefinitionUpdateDTO,
    InputSchemaDTO,
    OntologyCompositionUpdateDTO,
    OntologyCreateDTO,
    OntologyInputCreateDTO,
    OntologyInputResponseDTO,
    OntologyInputUpdateDTO,
    OntologyOutputCreateDTO,
    OntologyOutputResponseDTO,
    OntologyOutputUpdateDTO,
    OntologyResponseDTO,
    OntologyUpdateDTO,
    OntologyValidationResponseDTO,
    OntologyVersionCreateDTO,
    OntologyVersionInputDTO,
    OntologyVersionOutputDTO,
    OntologyVersionResponseDTO,
    OntologyVersionSchemaResponseDTO,
    OntologyVersionUpdateDTO,
    OutputDefinitionCreateDTO,
    OutputDefinitionResponseDTO,
    OutputDefinitionUpdateDTO,
)

__all__ = [name for name in globals() if name.endswith("DTO")]
