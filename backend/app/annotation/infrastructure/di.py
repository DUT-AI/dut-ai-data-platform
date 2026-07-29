from app.annotation.application.use_cases import (
    CreateAnnotationUseCase,
    CreateRevisionUseCase,
    GetAnnotationDetailUseCase,
    GetRevisionDetailUseCase,
    ListAnnotationRevisionsUseCase,
    ListAssetAnnotationsUseCase,
    OpenAssetInLabelStudioUseCase,
    SyncLabelStudioWebhookUseCase,
)
from app.annotation.infrastructure.label_studio_adapter import LabelStudioAdapter
from app.annotation.infrastructure.repository import AnnotationRepository
from app.ontology.infrastructure.repository import OntologyRepository
from dishka import Provider, Scope, provide
from domain.interfaces import (
    IAnnotationRepository,
    IOntologyRepository,
    IToolAdapter,
)
from sqlalchemy.ext.asyncio import AsyncSession


class AnnotationProvider(Provider):
    scope = Scope.REQUEST

    @provide
    def get_annotation_repository(self, session: AsyncSession) -> IAnnotationRepository:
        return AnnotationRepository(session)

    @provide
    def get_ontology_repository(self, session: AsyncSession) -> IOntologyRepository:
        return OntologyRepository(session)

    @provide
    def get_tool_adapter(self) -> IToolAdapter:
        return LabelStudioAdapter()

    @provide
    def get_ls_adapter(self) -> LabelStudioAdapter:
        return LabelStudioAdapter()

    @provide
    def create_annotation_uc(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
    ) -> CreateAnnotationUseCase:
        return CreateAnnotationUseCase(anno_repo, onto_repo)

    @provide
    def create_revision_uc(
        self, anno_repo: IAnnotationRepository
    ) -> CreateRevisionUseCase:
        return CreateRevisionUseCase(anno_repo)

    @provide
    def get_annotation_detail_uc(
        self, anno_repo: IAnnotationRepository
    ) -> GetAnnotationDetailUseCase:
        return GetAnnotationDetailUseCase(anno_repo)

    @provide
    def list_asset_annotations_uc(
        self, anno_repo: IAnnotationRepository
    ) -> ListAssetAnnotationsUseCase:
        return ListAssetAnnotationsUseCase(anno_repo)

    @provide
    def list_annotation_revisions_uc(
        self, anno_repo: IAnnotationRepository
    ) -> ListAnnotationRevisionsUseCase:
        return ListAnnotationRevisionsUseCase(anno_repo)

    @provide
    def get_revision_detail_uc(
        self, anno_repo: IAnnotationRepository
    ) -> GetRevisionDetailUseCase:
        return GetRevisionDetailUseCase(anno_repo)

    @provide
    def sync_label_studio_webhook_uc(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
        tool_adapter: IToolAdapter,
    ) -> SyncLabelStudioWebhookUseCase:
        return SyncLabelStudioWebhookUseCase(anno_repo, onto_repo, tool_adapter)

    @provide
    def open_asset_in_label_studio_uc(
        self,
        anno_repo: IAnnotationRepository,
        onto_repo: IOntologyRepository,
        ls_adapter: LabelStudioAdapter,
    ) -> OpenAssetInLabelStudioUseCase:
        return OpenAssetInLabelStudioUseCase(anno_repo, onto_repo, ls_adapter)
