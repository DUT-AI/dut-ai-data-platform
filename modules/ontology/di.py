from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.ontology.domain.interfaces import IOntologyRepository
from modules.ontology.repository.ontology_repository import SqlOntologyRepository
from modules.ontology.use_cases import (
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
    UpdateOntologyVersionUseCase,
)


class OntologyProvider(Provider):
    """Dishka DI Provider for Ontology feature module."""

    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IOntologyRepository:
        return SqlOntologyRepository(session)

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

    update_ontology_version_uc = provide(UpdateOntologyVersionUseCase)
