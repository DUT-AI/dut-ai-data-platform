from datetime import UTC, datetime

from app.annotation.application.dtos import RevisionCreateDTO
from domain.entities import (
    AnnotationResultEntity,
    AnnotationRevisionEntity,
)
from domain.exceptions import NotFoundException
from domain.interfaces import IAnnotationRepository
from shared.utils.id_generator import generate_ulid


class CreateRevisionUseCase:
    def __init__(self, anno_repo: IAnnotationRepository):
        self.anno_repo = anno_repo

    async def execute(
        self, annotation_id: str, dto: RevisionCreateDTO, created_by: str
    ) -> AnnotationRevisionEntity:
        annotation = await self.anno_repo.get_annotation_by_id(annotation_id)
        if not annotation:
            raise NotFoundException(f"Annotation '{annotation_id}' not found.")

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

        new_rev = AnnotationRevisionEntity(
            id=generate_ulid(),
            annotation_id=annotation_id,
            revision_number=0,  # calculated in repository
            created_by=created_by,
            source=dto.source,
            created_at=datetime.now(UTC),
            results=results,
        )

        return await self.anno_repo.create_revision(new_rev)
