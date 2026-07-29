from collections.abc import Sequence

from domain.entities import AnnotationEntity
from domain.interfaces import IAnnotationRepository


class ListAssetAnnotationsUseCase:
    def __init__(self, anno_repo: IAnnotationRepository):
        self.anno_repo = anno_repo

    async def execute(self, asset_id: str) -> Sequence[AnnotationEntity]:
        return await self.anno_repo.list_annotations_by_asset(asset_id)
