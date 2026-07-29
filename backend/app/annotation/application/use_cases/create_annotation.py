from datetime import UTC, datetime

from app.annotation.application.dtos import AnnotationCreateDTO
from domain.entities import (
    AnnotationEntity,
    AnnotationResultEntity,
    AnnotationRevisionEntity,
)
from domain.exceptions import ConflictException
from domain.interfaces import IAnnotationRepository, IOntologyRepository
from shared.utils.id_generator import generate_ulid


class CreateAnnotationUseCase:
    def __init__(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
    ):
        self.anno_repo = anno_repo
        self.onto_repo = onto_repo

    async def execute(
        self, dto: AnnotationCreateDTO, created_by: str
    ) -> AnnotationEntity:
        # Check if annotation already exists for asset + ontology_version
        existing = await self.anno_repo.get_annotation_by_asset_and_ontology(
            dto.asset_id, dto.ontology_version_id
        )
        if existing:
            raise ConflictException(
                f"Annotation already exists for asset '{dto.asset_id}' and ontology version '{dto.ontology_version_id}'."
            )

        annotation = AnnotationEntity(
            id=generate_ulid(),
            asset_id=dto.asset_id,
            project_id=dto.project_id,
            ontology_version_id=dto.ontology_version_id,
            created_by=created_by,
            created_at=datetime.now(UTC),
        )
        saved_annotation = await self.anno_repo.save_annotation(annotation)

        # Create initial revision 1
        results = [
            AnnotationResultEntity(
                id=generate_ulid(),
                revision_id="",
                category_id=res.category_id,
                result_type=res.result_type,
                geometry=res.geometry,
                payload=res.payload,
                attributes=res.attributes,
            )
            for res in dto.results
        ]

        initial_rev = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=saved_annotation.id,
            revision_number=1,
            created_by=created_by,
            source=dto.source,
            created_at=datetime.now(UTC),
            results=results,
        )

        saved_rev = await self.anno_repo.create_revision(initial_rev)
        saved_annotation.revisions = [saved_rev]
        return saved_annotation
