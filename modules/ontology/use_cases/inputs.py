from core.exceptions import BadRequestException, NotFoundException
from modules.ontology.domain.entities import OntologyInputEntity
from modules.ontology.domain.interfaces import (
    IInputDefinitionRepository,
    IOntologyInputRepository,
    IOntologyRepository,
)
from modules.ontology.domain.validators import validate_input
from modules.ontology.dtos import (
    OntologyInputCreateDTO,
    OntologyInputResponseDTO,
    OntologyInputUpdateDTO,
)
from modules.ontology.use_cases.common import require_ontology, require_unlocked


class _InputUseCaseBase:
    def __init__(
        self,
        repo: IOntologyInputRepository,
        definitions: IInputDefinitionRepository,
        ontologies: IOntologyRepository,
    ) -> None:
        self.repo, self.definitions, self.ontologies = repo, definitions, ontologies

    async def list(
        self, project_id: str, ontology_id: str
    ) -> list[OntologyInputResponseDTO]:
        await require_ontology(self.ontologies, project_id, ontology_id)
        return [
            OntologyInputResponseDTO.model_validate(item)
            for item in await self.repo.list_by_ontology(ontology_id)
        ]

    async def get(
        self, project_id: str, ontology_id: str, entity_id: str
    ) -> OntologyInputResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        item = await self.repo.get(entity_id)
        if item is None or item.ontology_id != ontology_id:
            raise NotFoundException("Input không tồn tại.")
        return OntologyInputResponseDTO.model_validate(item)

    async def create(
        self, project_id: str, ontology_id: str, data: OntologyInputCreateDTO
    ) -> OntologyInputResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        definition = await self.definitions.get(data.definition_id)
        if definition is None:
            raise NotFoundException("Input Definition không tồn tại.")
        entity = OntologyInputEntity(
            ontology_id=ontology_id,
            definition=definition,
            **data.model_dump(exclude={"input_schema"}),
            input_schema=data.input_schema.model_dump(),
        )
        issues = validate_input(entity)
        if issues:
            raise BadRequestException("; ".join(item.message for item in issues))
        return OntologyInputResponseDTO.model_validate(await self.repo.add(entity))

    async def update(
        self,
        project_id: str,
        ontology_id: str,
        entity_id: str,
        data: OntologyInputUpdateDTO,
    ) -> OntologyInputResponseDTO:
        await require_ontology(self.ontologies, project_id, ontology_id)
        item = await self.repo.get(entity_id)
        if item is None or item.ontology_id != ontology_id:
            raise NotFoundException("Input không tồn tại.")
        require_unlocked(await self.repo.is_locked(entity_id), "Input")
        values = data.model_dump(exclude_unset=True)
        if data.definition_id is not None:
            definition = await self.definitions.get(data.definition_id)
            if definition is None:
                raise NotFoundException("Input Definition không tồn tại.")
            item.definition = definition
        if data.input_schema is not None:
            values["input_schema"] = data.input_schema.model_dump()
        for key, value in values.items():
            setattr(item, key, value)
        issues = validate_input(item)
        if issues:
            raise BadRequestException("; ".join(issue.message for issue in issues))
        return OntologyInputResponseDTO.model_validate(await self.repo.update(item))

    async def delete(self, project_id: str, ontology_id: str, entity_id: str) -> None:
        await self.get(project_id, ontology_id, entity_id)
        require_unlocked(await self.repo.is_locked(entity_id), "Input")
        await self.repo.delete(entity_id)


class ListOntologyInputsUseCase(_InputUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str):
        return await self.list(project_id, ontology_id)


class GetOntologyInputUseCase(_InputUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, input_id: str):
        return await self.get(project_id, ontology_id, input_id)


class CreateOntologyInputUseCase(_InputUseCaseBase):
    async def execute(
        self, project_id: str, ontology_id: str, data: OntologyInputCreateDTO
    ):
        return await self.create(project_id, ontology_id, data)


class UpdateOntologyInputUseCase(_InputUseCaseBase):
    async def execute(
        self,
        project_id: str,
        ontology_id: str,
        input_id: str,
        data: OntologyInputUpdateDTO,
    ):
        return await self.update(project_id, ontology_id, input_id, data)


class DeleteOntologyInputUseCase(_InputUseCaseBase):
    async def execute(self, project_id: str, ontology_id: str, input_id: str):
        await self.delete(project_id, ontology_id, input_id)
