from core.exceptions import NotFoundException
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.dtos.annotation_dtos import (
    AnnotationRevisionResponseDTO,
)


class GetRevisionDetailUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, revision_id: str) -> AnnotationRevisionResponseDTO:
        revision = await self.anno_repo.get_revision_by_id(revision_id)
        if not revision:
            raise NotFoundException(f"Revision '{revision_id}' not found.")
        return AnnotationRevisionResponseDTO.model_validate(revision)


class ListAnnotationRevisionsUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, annotation_id: str) -> list[AnnotationRevisionResponseDTO]:
        revs = await self.anno_repo.list_revisions_by_annotation(annotation_id)
        return [AnnotationRevisionResponseDTO.model_validate(r) for r in revs]
