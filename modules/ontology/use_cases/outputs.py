from core.exceptions import BadRequestException, NotFoundException
from modules.ontology.domain.entities import OntologyOutputEntity
from modules.ontology.domain.interfaces import (
    IOntologyOutputRepository,
    IOntologyRepository,
    IOutputDefinitionRepository,
)
from modules.ontology.dtos import (
    OntologyOutputCreateDTO,
    OntologyOutputResponseDTO,
    OntologyOutputUpdateDTO,
)
from modules.ontology.use_cases.common import require_ontology, require_unlocked


class _OutputUseCaseBase:
    def __init__(
        self,
        repo: IOntologyOutputRepository,
        definitions: IOutputDefinitionRepository,
        ontologies: IOntologyRepository,
    ) -> None:
        self.repo, self.definitions, self.ontologies = repo, definitions, ontologies

    async def list(
        self, project_id: str, ontology_id: str
    ) -> list[OntologyOutputResponseDTO]:
        await require_ontology(self.ontologies, project_id, ontology_id)
        return [
            OntologyOutputResponseDTO.model_validate(item)
            for item in await self.repo.list_by_ontology(ontology_id)
        ]

    async def get(
        self, project_id: str, ontology_id: str, entity_id: str
    ) -> OntologyOutputResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        item = await self.repo.get(entity_id)
        if item is None or item.ontology_id != ontology_id:
            raise NotFoundException("Output không tồn tại.")
        return OntologyOutputResponseDTO.model_validate(item)

    async def create(
        self, project_id: str, ontology_id: str, data: OntologyOutputCreateDTO
    ) -> OntologyOutputResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        definition = await self.definitions.get(data.definition_id)
        if definition is None:
            raise NotFoundException("Output Definition không tồn tại.")
        if definition.code == "custom_object" and not data.value_schema:
            raise BadRequestException("Custom Object cần value_schema.")
        if definition.code != "custom_object" and data.value_schema is not None:
            raise BadRequestException("Chỉ Custom Object được khai báo value_schema.")
        entity = OntologyOutputEntity(
            ontology_id=ontology_id, definition=definition, **data.model_dump()
        )
        return OntologyOutputResponseDTO.model_validate(await self.repo.add(entity))

    async def update(
        self,
        project_id: str,
        ontology_id: str,
        entity_id: str,
        data: OntologyOutputUpdateDTO,
    ) -> OntologyOutputResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        item = await self.repo.get(entity_id)
        if item is None or item.ontology_id != ontology_id:
            raise NotFoundException("Output không tồn tại.")
        require_unlocked(await self.repo.is_locked(entity_id), "Output")
        if data.definition_id is not None:
            definition = await self.definitions.get(data.definition_id)
            if definition is None:
                raise NotFoundException("Output Definition không tồn tại.")
            item.definition = definition
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        if (
            item.definition
            and item.definition.code == "custom_object"
            and not item.value_schema
        ):
            raise BadRequestException("Custom Object cần value_schema.")
        if (
            item.definition
            and item.definition.code != "custom_object"
            and item.value_schema is not None
        ):
            raise BadRequestException("Chỉ Custom Object được khai báo value_schema.")
        return OntologyOutputResponseDTO.model_validate(await self.repo.update(item))

    async def delete(self, project_id: str, ontology_id: str, entity_id: str) -> None:
        await self.get(project_id, ontology_id, entity_id)
        require_unlocked(await self.repo.is_locked(entity_id), "Output")
        await self.repo.delete(entity_id)


class ListOntologyOutputsUseCase(_OutputUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str):
        return await self.list(project_id, ontology_id)


class GetOntologyOutputUseCase(_OutputUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, output_id: str):
        return await self.get(project_id, ontology_id, output_id)


class CreateOntologyOutputUseCase(_OutputUseCaseBase):
    async def execute(
        self, project_id: str, ontology_id: str, data: OntologyOutputCreateDTO
    ):
        return await self.create(project_id, ontology_id, data)


class UpdateOntologyOutputUseCase(_OutputUseCaseBase):
    async def execute(
        self,
        project_id: str,
        ontology_id: str,
        output_id: str,
        data: OntologyOutputUpdateDTO,
    ):
        return await self.update(project_id, ontology_id, output_id, data)


class DeleteOntologyOutputUseCase(_OutputUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, output_id: str):
        await self.delete(project_id, ontology_id, output_id)
