from domain.entities import AnnotationRevisionEntity
from domain.exceptions import NotFoundException
from domain.interfaces import IAnnotationRepository


class GetRevisionDetailUseCase:
    def __init__(self, anno_repo: IAnnotationRepository):
        self.anno_repo = anno_repo

    async def execute(self, revision_id: str) -> AnnotationRevisionEntity:
        rev = await self.anno_repo.get_revision_by_id(revision_id)
        if not rev:
            raise NotFoundException(f"Annotation Revision '{revision_id}' not found.")
        return rev
