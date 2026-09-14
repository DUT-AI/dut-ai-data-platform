from core.exceptions import NotFoundException
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.dtos.annotation_dtos import (
    AnnotationResponseDTO,
    AnnotationRevisionResponseDTO,
)


class GetAnnotationDetailUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, annotation_id: str) -> AnnotationResponseDTO:
        annotation = await self.anno_repo.get_annotation_by_id(annotation_id)
        if not annotation:
            raise NotFoundException(f"Annotation '{annotation_id}' not found.")

        resp = AnnotationResponseDTO.model_validate(annotation)
        if annotation.revisions:
            resp.latest_revision = AnnotationRevisionResponseDTO.model_validate(
                annotation.revisions[-1]
            )
        return resp


class ListAssetAnnotationsUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(
        self, asset_id: str, target_type: str | None = None
    ) -> list[AnnotationResponseDTO]:
        annotations = await self.anno_repo.list_annotations_by_asset(
            asset_id, target_type=target_type
        )
        res = []
        for a in annotations:
            dto = AnnotationResponseDTO.model_validate(a)
            if a.revisions:
                dto.latest_revision = AnnotationRevisionResponseDTO.model_validate(
                    a.revisions[-1]
                )
            res.append(dto)
        return res
