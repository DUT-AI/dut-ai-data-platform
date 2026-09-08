# ruff: noqa: F401

from modules.ontology.domain.entities import (
    CategoryEntity,
    InputDefinitionEntity,
    OntologyEntity,
    OntologyInputEntity,
    OntologyOutputEntity,
    OntologyVersionEntity,
    OutputDefinitionEntity,
)
from modules.ontology.domain.interfaces import (
    ICategoryRepository,
    IInputDefinitionRepository,
    IOntologyInputRepository,
    IOntologyOutputRepository,
    IOntologyRepository,
    IOntologyVersionRepository,
    IOutputDefinitionRepository,
)

__all__ = [
    name for name in globals() if name.endswith("Entity") or name.startswith("I")
]
