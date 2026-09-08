from core.exceptions import ConflictException, NotFoundException
from modules.ontology.domain.entities import (
    InputDefinitionEntity,
    OutputDefinitionEntity,
)
from modules.ontology.domain.interfaces import (
    IInputDefinitionRepository,
    IOutputDefinitionRepository,
)
from modules.ontology.dtos import (
    InputDefinitionCreateDTO,
    InputDefinitionResponseDTO,
    InputDefinitionUpdateDTO,
    OutputDefinitionCreateDTO,
    OutputDefinitionResponseDTO,
    OutputDefinitionUpdateDTO,
)


class ListInputDefinitionsUseCase:
    def __init__(self, repo: IInputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(self) -> list[InputDefinitionResponseDTO]:
        return [
            InputDefinitionResponseDTO.model_validate(item)
            for item in await self.repo.list()
        ]


class GetInputDefinitionUseCase:
    def __init__(self, repo: IInputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(self, entity_id: str) -> InputDefinitionResponseDTO:
        item = await self.repo.get(entity_id)
        if item is None:
            raise NotFoundException("Input Definition không tồn tại.")
        return InputDefinitionResponseDTO.model_validate(item)


class CreateInputDefinitionUseCase:
    def __init__(self, repo: IInputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(
        self, data: InputDefinitionCreateDTO
    ) -> InputDefinitionResponseDTO:
        saved = await self.repo.add(InputDefinitionEntity(**data.model_dump()))
        return InputDefinitionResponseDTO.model_validate(saved)


class UpdateInputDefinitionUseCase:
    def __init__(self, repo: IInputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(
        self, entity_id: str, data: InputDefinitionUpdateDTO
    ) -> InputDefinitionResponseDTO:
        item = await self.repo.get(entity_id)
        if item is None:
            raise NotFoundException("Input Definition không tồn tại.")
        if await self.repo.is_used(entity_id):
            raise ConflictException("Input Definition đang được sử dụng.")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        return InputDefinitionResponseDTO.model_validate(await self.repo.update(item))


class DeleteInputDefinitionUseCase:
    def __init__(self, repo: IInputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(self, entity_id: str) -> None:
        if await self.repo.get(entity_id) is None:
            raise NotFoundException("Input Definition không tồn tại.")
        if await self.repo.is_used(entity_id):
            raise ConflictException("Input Definition đang được sử dụng.")
        await self.repo.delete(entity_id)


class ListOutputDefinitionsUseCase:
    def __init__(self, repo: IOutputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(self) -> list[OutputDefinitionResponseDTO]:
        return [
            OutputDefinitionResponseDTO.model_validate(item)
            for item in await self.repo.list()
        ]


class GetOutputDefinitionUseCase:
    def __init__(self, repo: IOutputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(self, entity_id: str) -> OutputDefinitionResponseDTO:
        item = await self.repo.get(entity_id)
        if item is None:
            raise NotFoundException("Output Definition không tồn tại.")
        return OutputDefinitionResponseDTO.model_validate(item)


class CreateOutputDefinitionUseCase:
    def __init__(self, repo: IOutputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(
        self, data: OutputDefinitionCreateDTO
    ) -> OutputDefinitionResponseDTO:
        return OutputDefinitionResponseDTO.model_validate(
            await self.repo.add(OutputDefinitionEntity(**data.model_dump()))
        )


class UpdateOutputDefinitionUseCase:
    def __init__(self, repo: IOutputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(
        self, entity_id: str, data: OutputDefinitionUpdateDTO
    ) -> OutputDefinitionResponseDTO:
        item = await self.repo.get(entity_id)
        if item is None:
            raise NotFoundException("Output Definition không tồn tại.")
        if await self.repo.is_used(entity_id):
            raise ConflictException("Output Definition đang được sử dụng.")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        return OutputDefinitionResponseDTO.model_validate(await self.repo.update(item))


class DeleteOutputDefinitionUseCase:
    def __init__(self, repo: IOutputDefinitionRepository) -> None:
        self.repo = repo

    async def execute(self, entity_id: str) -> None:
        if await self.repo.get(entity_id) is None:
            raise NotFoundException("Output Definition không tồn tại.")
        if await self.repo.is_used(entity_id):
            raise ConflictException("Output Definition đang được sử dụng.")
        await self.repo.delete(entity_id)
