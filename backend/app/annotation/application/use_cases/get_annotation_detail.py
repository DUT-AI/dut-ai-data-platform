from domain.entities import AnnotationEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IAnnotationRepository


class GetAnnotationDetailUseCase:
    def __init__(self, anno_repo: IAnnotationRepository):
        self.anno_repo = anno_repo

    async def execute(self, annotation_id: str) -> AnnotationEntity:
        annotation = await self.anno_repo.get_annotation_by_id(annotation_id)
        if not annotation:
            raise NotFoundException(f"Annotation '{annotation_id}' not found.")
        return annotation
