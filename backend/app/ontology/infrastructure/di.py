from app.ontology.application.use_cases import (
    CloneOntologyVersionUseCase,
    CreateAttributeUseCase,
    CreateCategoryUseCase,
    CreateOntologyUseCase,
    CreateOntologyVersionUseCase,
    DeleteAttributeUseCase,
    DeleteCategoryUseCase,
    GetOntologyVersionDetailUseCase,
    ListProjectOntologiesUseCase,
    PublishOntologyVersionUseCase,
    UpdateAttributeUseCase,
    UpdateCategoryUseCase,
)
from app.ontology.infrastructure.repository import OntologyRepository
from dishka import Provider, Scope, provide
from domain.interfaces import IOntologyRepository
from sqlalchemy.ext.asyncio import AsyncSession


class OntologyProvider(Provider):
    """Dishka DI Provider for Ontology feature module."""

    scope = Scope.REQUEST

    @provide
    def get_ontology_repository(self, session: AsyncSession) -> IOntologyRepository:
        return OntologyRepository(session)

    create_ontology_uc = provide(CreateOntologyUseCase)
    list_project_ontologies_uc = provide(ListProjectOntologiesUseCase)
    create_ontology_version_uc = provide(CreateOntologyVersionUseCase)
    get_ontology_version_detail_uc = provide(GetOntologyVersionDetailUseCase)
    publish_ontology_version_uc = provide(PublishOntologyVersionUseCase)
    clone_ontology_version_uc = provide(CloneOntologyVersionUseCase)
    create_category_uc = provide(CreateCategoryUseCase)
    update_category_uc = provide(UpdateCategoryUseCase)
    delete_category_uc = provide(DeleteCategoryUseCase)
    create_attribute_uc = provide(CreateAttributeUseCase)
    update_attribute_uc = provide(UpdateAttributeUseCase)
    delete_attribute_uc = provide(DeleteAttributeUseCase)
