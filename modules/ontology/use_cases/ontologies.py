import logging

from core.exceptions import ConflictException, NotFoundException
from modules.ontology.domain.entities import (
    OntologyEntity,
    OntologyVersionEntity,
)
from modules.ontology.domain.interfaces import (
    IOntologyRepository,
    IOntologyTemplateSeederService,
    IOntologyVersionRepository,
)
from modules.ontology.dtos import (
    OntologyCreateDTO,
    OntologyResponseDTO,
    OntologyUpdateDTO,
)

logger = logging.getLogger(__name__)


class CreateOntologyUseCase:
    """Creates a new project ontology and draft version with optional template seeding."""

    def __init__(
        self,
        repo: IOntologyRepository,
        versions: IOntologyVersionRepository,
        seeder: IOntologyTemplateSeederService,
    ) -> None:
        self.repo = repo
        self.versions = versions
        self.seeder = seeder

    async def execute(
        self, project_id: str, data: OntologyCreateDTO
    ) -> OntologyResponseDTO:
        existing = await self.repo.get_by_project(project_id)
        if existing is not None:
            raise ConflictException(
                "Project đã có Ontology; mỗi Project chỉ sở hữu duy nhất 1 Ontology."
            )
        ontology = await self.repo.add(
            OntologyEntity(project_id=project_id, **data.model_dump())
        )
        draft = await self.versions.add(
            OntologyVersionEntity(
                ontology_id=ontology.id, version_no=1, name="Version 1"
            )
        )
        ontology.versions = [draft]
        if self.seeder:
            await self.seeder.seed_from_project_template(
                project_id=project_id,
                ontology=ontology,
                draft_version=draft,
            )
        updated = await self.repo.get_by_project(project_id)
        if updated:
            ontology = updated
        return OntologyResponseDTO.model_validate(ontology)


class GetProjectOntologyUseCase:
    """Retrieves or provisions the default project ontology with optional template seeding."""

    def __init__(
        self,
        repo: IOntologyRepository,
        versions: IOntologyVersionRepository,
        seeder: IOntologyTemplateSeederService,
    ) -> None:
        self.repo = repo
        self.versions = versions
        self.seeder = seeder

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

        # If draft has no outputs, auto-seed from project template if available
        draft = next((v for v in ontology.versions if v.status == "draft"), None)
        if draft and not draft.outputs and self.seeder:
            await self.seeder.seed_from_project_template(
                project_id=project_id,
                ontology=ontology,
                draft_version=draft,
            )
            updated = await self.repo.get_by_project(project_id)
            if updated:
                ontology = updated

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
