from datetime import UTC, datetime

from domain.entities import OntologyVersionEntity
from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IOntologyRepository


class PublishOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(self, version_id: str) -> OntologyVersionEntity:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology Version '{version_id}' not found.")

        if version.status != "draft":
            raise BadRequestException(
                f"Cannot publish version '{version_id}' with status '{version.status}'. Only draft versions can be published."
            )

        updated_version = OntologyVersionEntity(
            id=version.id,
            ontology_id=version.ontology_id,
            version=version.version,
            status="published",
            created_at=version.created_at,
            published_at=datetime.now(UTC),
            categories=version.categories,
        )
        return await self.repo.save_version(updated_version)
