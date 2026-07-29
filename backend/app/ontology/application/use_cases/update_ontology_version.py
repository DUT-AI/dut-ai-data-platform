from domain.entities import OntologyVersionEntity
from domain.exceptions import BadRequestException, NotFoundException
from domain.interfaces import IOntologyRepository


class UpdateOntologyVersionUseCase:
    def __init__(self, repo: IOntologyRepository):
        self.repo = repo

    async def execute(
        self, version_id: str, raw_label_config: str | None
    ) -> OntologyVersionEntity:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Ontology Version '{version_id}' not found.")

        if version.status != "draft":
            raise BadRequestException(
                f"Cannot update version '{version_id}' with status '{version.status}'. Only draft versions can be modified."
            )

        updated_version = OntologyVersionEntity(
            id=version.id,
            ontology_id=version.ontology_id,
            version=version.version,
            status=version.status,
            created_at=version.created_at,
            published_at=version.published_at,
            raw_label_config=raw_label_config,
            categories=version.categories,
        )
        return await self.repo.save_version(updated_version)
