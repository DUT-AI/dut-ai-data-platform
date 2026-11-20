from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.repository.annotation_repository import (
    SqlAnnotationRepository,
)
from modules.annotation.use_cases import (
    CreateAnnotationUseCase,
    CreateRevisionUseCase,
    GetAnnotationDetailUseCase,
    GetBatchAssetStatusUseCase,
    GetRevisionDetailUseCase,
    ListAnnotationRevisionsUseCase,
    ListAssetAnnotationsUseCase,
)


class AnnotationProvider(Provider):
    """Dishka DI Provider for Annotation feature module."""

    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IAnnotationRepository:
        return SqlAnnotationRepository(session)

    create_annotation_uc = provide(CreateAnnotationUseCase)
    create_revision_uc = provide(CreateRevisionUseCase)
    get_annotation_detail_uc = provide(GetAnnotationDetailUseCase)
    get_batch_asset_status_uc = provide(GetBatchAssetStatusUseCase)
    get_revision_detail_uc = provide(GetRevisionDetailUseCase)
    list_annotation_revisions_uc = provide(ListAnnotationRevisionsUseCase)
    list_asset_annotations_uc = provide(ListAssetAnnotationsUseCase)
