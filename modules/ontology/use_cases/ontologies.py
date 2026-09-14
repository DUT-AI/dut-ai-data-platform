from core.exceptions import ConflictException, NotFoundException
from modules.ontology.domain.entities import OntologyEntity, OntologyVersionEntity
from modules.ontology.domain.interfaces import (
    IOntologyRepository,
    IOntologyVersionRepository,
)
from modules.ontology.dtos import (
    OntologyCreateDTO,
    OntologyResponseDTO,
    OntologyUpdateDTO,
)


class CreateOntologyUseCase:
    def __init__(
        self, repo: IOntologyRepository, versions: IOntologyVersionRepository
    ) -> None:
        self.repo, self.versions = repo, versions

    async def execute(
        self, project_id: str, data: OntologyCreateDTO
    ) -> OntologyResponseDTO:
        existing = await self.repo.get_by_project(project_id)
        if existing is not None:
            raise ConflictException("Project đã có Ontology; mỗi Project chỉ sở hữu duy nhất 1 Ontology.")
        ontology = await self.repo.add(
            OntologyEntity(project_id=project_id, **data.model_dump())
        )
        draft = await self.versions.add(
            OntologyVersionEntity(
                ontology_id=ontology.id, version_no=1, name="Version 1"
            )
        )
        ontology.versions = [draft]
        return OntologyResponseDTO.model_validate(ontology)


class GetProjectOntologyUseCase:
    def __init__(
        self, repo: IOntologyRepository, versions: IOntologyVersionRepository
    ) -> None:
        self.repo, self.versions = repo, versions

    async def execute(self, project_id: str) -> OntologyResponseDTO:
        ontology = await self.repo.get_by_project(project_id)
        if ontology is None:
            # Auto-create default ontology for projects that don't have one
            ontology = await self.repo.add(
                OntologyEntity(project_id=project_id, name="Project Ontology")
            )
            draft = await self.versions.add(
                OntologyVersionEntity(
                    ontology_id=ontology.id, version_no=1, name="Version 1"
                )
            )
            ontology.versions = [draft]
        return OntologyResponseDTO.model_validate(ontology)


class ListProjectOntologiesUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> list[OntologyResponseDTO]:
        return [
            OntologyResponseDTO.model_validate(item)
            for item in await self.repo.list_by_project(project_id)
        ]


class GetOntologyUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, ontology_id: str) -> OntologyResponseDTO:
        item = await self.repo.get(ontology_id)
        if item is None or item.project_id != project_id:
            raise NotFoundException("Ontology không tồn tại trong Project này.")
        return OntologyResponseDTO.model_validate(item)


class UpdateOntologyUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, ontology_id: str, data: OntologyUpdateDTO
    ) -> OntologyResponseDTO:
        item = await self.repo.get(ontology_id)
        if item is None or item.project_id != project_id:
            raise NotFoundException("Ontology không tồn tại trong Project này.")
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(item, key, value)
        return OntologyResponseDTO.model_validate(await self.repo.update(item))


class DeleteOntologyUseCase:
    def __init__(self, repo: IOntologyRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, ontology_id: str) -> None:
        item = await self.repo.get(ontology_id)
        if item is None or item.project_id != project_id:
            raise NotFoundException("Ontology không tồn tại trong Project này.")
        if await self.repo.has_published_version(ontology_id):
            raise ConflictException("Ontology có Published Version nên không thể xóa.")
        await self.repo.delete(ontology_id)
