from collections.abc import Sequence

from domain.entities import AnnotationRevisionEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IAnnotationRepository


class ListAnnotationRevisionsUseCase:
    def __init__(self, anno_repo: IAnnotationRepository):
        self.anno_repo = anno_repo

    async def execute(self, annotation_id: str) -> Sequence[AnnotationRevisionEntity]:
        annotation = await self.anno_repo.get_annotation_by_id(annotation_id)
        if not annotation:
            raise NotFoundException(f"Annotation '{annotation_id}' not found.")

        return await self.anno_repo.list_revisions_by_annotation(annotation_id)
