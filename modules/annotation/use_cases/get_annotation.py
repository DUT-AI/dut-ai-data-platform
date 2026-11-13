from core.exceptions import NotFoundException
from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.dtos.annotation_dtos import (
    AnnotationResponseDTO,
    AnnotationRevisionResponseDTO,
    BatchAssetStatusItemDTO,
    BatchAssetStatusResponseDTO,
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


class GetBatchAssetStatusUseCase:
    def __init__(self, anno_repo: IAnnotationRepository) -> None:
        self.anno_repo = anno_repo

    async def execute(self, asset_ids: list[str]) -> BatchAssetStatusResponseDTO:
        statuses: dict[str, BatchAssetStatusItemDTO] = {
            aid: BatchAssetStatusItemDTO(
                asset_id=aid,
                is_annotated=False,
                objects_count=0,
                last_updated_at=None,
            )
            for aid in asset_ids
        }
        if not asset_ids:
            return BatchAssetStatusResponseDTO(statuses=statuses)

        annotations = await self.anno_repo.list_annotations_by_asset_ids(asset_ids)
        for a in annotations:
            aid = a.asset_id
            if aid not in statuses:
                statuses[aid] = BatchAssetStatusItemDTO(
                    asset_id=aid,
                    is_annotated=False,
                    objects_count=0,
                    last_updated_at=None,
                )
            if a.revisions:
                latest_rev = a.revisions[-1]
                results = latest_rev.results or []
                rev_updated = latest_rev.created_at or a.updated_at
                if len(results) > 0:
                    current = statuses[aid]
                    if not current.is_annotated:
                        statuses[aid] = BatchAssetStatusItemDTO(
                            asset_id=aid,
                            is_annotated=True,
                            objects_count=len(results),
                            last_updated_at=rev_updated,
                        )
                    else:
                        statuses[aid] = BatchAssetStatusItemDTO(
                            asset_id=aid,
                            is_annotated=True,
                            objects_count=current.objects_count + len(results),
                            last_updated_at=max(
                                filter(None, [current.last_updated_at, rev_updated]),
                                default=rev_updated,
                            ),
                        )
        return BatchAssetStatusResponseDTO(statuses=statuses)
