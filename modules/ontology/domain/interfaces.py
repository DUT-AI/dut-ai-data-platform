from abc import ABC, abstractmethod
from collections.abc import Sequence

from modules.ontology.domain.entities import (
    AttributeEntity,
    CategoryEntity,
    OntologyEntity,
    OntologyVersionEntity,
)


class IOntologyRepository(ABC):
    @abstractmethod
    async def save_ontology(self, ontology: OntologyEntity) -> OntologyEntity:
        pass

    @abstractmethod
    async def get_ontology_by_id(self, ontology_id: str) -> OntologyEntity | None:
        pass

    @abstractmethod
    async def list_ontologies_by_project(
        self, project_id: str
    ) -> Sequence[OntologyEntity]:
        pass

    @abstractmethod
    async def save_version(
        self, version: OntologyVersionEntity
    ) -> OntologyVersionEntity:
        pass

    @abstractmethod
    async def get_version_by_id(self, version_id: str) -> OntologyVersionEntity | None:
        pass

    @abstractmethod
    async def list_versions_by_ontology(
        self, ontology_id: str
    ) -> Sequence[OntologyVersionEntity]:
        pass

    @abstractmethod
    async def save_category(self, category: CategoryEntity) -> CategoryEntity:
        pass

    @abstractmethod
    async def get_category_by_id(self, category_id: str) -> CategoryEntity | None:
        pass

    @abstractmethod
    async def get_category_by_name(
        self, version_id: str, name: str
    ) -> CategoryEntity | None:
        pass

    @abstractmethod
    async def delete_category(self, category_id: str) -> bool:
        pass

    @abstractmethod
    async def save_attribute(self, attribute: AttributeEntity) -> AttributeEntity:
        pass

    @abstractmethod
    async def get_attribute_by_id(self, attribute_id: str) -> AttributeEntity | None:
        pass

    @abstractmethod
    async def get_attribute_by_name(
        self, category_id: str, name: str
    ) -> AttributeEntity | None:
        pass

    @abstractmethod
    async def delete_attribute(self, attribute_id: str) -> bool:
        pass

    @abstractmethod
    async def clone_version(
        self, source_version_id: str, new_version_name: str
    ) -> OntologyVersionEntity:
        pass
