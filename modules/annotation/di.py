from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.annotation.domain.interfaces import IAnnotationRepository
from modules.annotation.integrations.label_studio_adapter import (
    LabelStudioAdapter,
)
from modules.annotation.repository.annotation_repository import (
    SqlAnnotationRepository,
)
from modules.annotation.use_cases import (
    CreateAnnotationUseCase,
    CreateRevisionUseCase,
    GetAnnotationDetailUseCase,
    GetRevisionDetailUseCase,
    ListAnnotationRevisionsUseCase,
    ListAssetAnnotationsUseCase,
    OpenAssetInLabelStudioUseCase,
    SyncLabelStudioWebhookUseCase,
)


class AnnotationProvider(Provider):
    """Dishka DI Provider for Annotation feature module."""

    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IAnnotationRepository:
        return SqlAnnotationRepository(session)

    @provide(scope=Scope.APP)
    def get_label_studio_adapter(self) -> LabelStudioAdapter:
        return LabelStudioAdapter()

    create_annotation_uc = provide(CreateAnnotationUseCase)
    create_revision_uc = provide(CreateRevisionUseCase)
    get_annotation_detail_uc = provide(GetAnnotationDetailUseCase)
    get_revision_detail_uc = provide(GetRevisionDetailUseCase)
    list_annotation_revisions_uc = provide(ListAnnotationRevisionsUseCase)
    list_asset_annotations_uc = provide(ListAssetAnnotationsUseCase)
    open_asset_in_label_studio_uc = provide(OpenAssetInLabelStudioUseCase)
    sync_label_studio_webhook_uc = provide(SyncLabelStudioWebhookUseCase)
