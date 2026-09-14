from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.project.domain.access import IProjectAccessChecker
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository
from modules.project.domain.events import (
    InMemoryProjectEventPublisher,
    IProjectEventPublisher,
)
from modules.project.domain.interfaces import IProjectRepository
from modules.project.integrations.access_checker import LegacyProjectAccessChecker
from modules.project.repository import InMemoryProjectCatalogRepository, SqlProjectRepository
from modules.project.use_cases import (
    AddProjectMemberUseCase,
    ArchiveProjectUseCase,
    CreateProjectUseCase,
    GetProjectConfigUseCase,
    GetProjectTemplateUseCase,
    GetProjectUseCase,
    ListProjectMembersUseCase,
    ListProjectTemplatesUseCase,
    ListTemplateGroupsUseCase,
    ListUserProjectsUseCase,
    RemoveProjectMemberUseCase,
    RestoreProjectUseCase,
    UpdateProjectConfigUseCase,
    UpdateProjectMemberUseCase,
    UpdateProjectUseCase,
)


class ProjectProvider(Provider):
    """Dishka DI Provider for Project feature module."""

    scope = Scope.REQUEST

    @provide
    def get_repository(self, session: AsyncSession) -> IProjectRepository:
        return SqlProjectRepository(session)

    @provide
    def get_catalog_repository(self) -> IProjectCatalogRepository:
        return InMemoryProjectCatalogRepository()

    @provide
    def get_access_checker(self, session: AsyncSession) -> IProjectAccessChecker:
        return LegacyProjectAccessChecker(session)

    @provide(scope=Scope.APP)
    def get_event_publisher(self) -> IProjectEventPublisher:
        return InMemoryProjectEventPublisher()

    create_project_uc = provide(CreateProjectUseCase)
    list_user_projects_uc = provide(ListUserProjectsUseCase)
    get_project_uc = provide(GetProjectUseCase)
    update_project_uc = provide(UpdateProjectUseCase)
    archive_project_uc = provide(ArchiveProjectUseCase)
    restore_project_uc = provide(RestoreProjectUseCase)
    list_project_templates_uc = provide(ListProjectTemplatesUseCase)
    list_template_groups_uc = provide(ListTemplateGroupsUseCase)
    get_project_template_uc = provide(GetProjectTemplateUseCase)


    add_project_member_uc = provide(AddProjectMemberUseCase)
    list_project_members_uc = provide(ListProjectMembersUseCase)
    update_project_member_uc = provide(UpdateProjectMemberUseCase)
    remove_project_member_uc = provide(RemoveProjectMemberUseCase)

    get_project_config_uc = provide(GetProjectConfigUseCase)
    update_project_config_uc = provide(UpdateProjectConfigUseCase)

