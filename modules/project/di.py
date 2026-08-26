from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

from modules.project.domain.interfaces import IProjectRepository
from modules.project.repository.project_repository import SqlProjectRepository
from modules.project.use_cases import (
    AddProjectMemberUseCase,
    ArchiveProjectUseCase,
    CreateProjectUseCase,
    GetProjectConfigUseCase,
    GetProjectUseCase,
    ListProjectMembersUseCase,
    ListUserProjectsUseCase,
    RemoveProjectMemberUseCase,
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

    create_project_uc = provide(CreateProjectUseCase)
    list_user_projects_uc = provide(ListUserProjectsUseCase)
    get_project_uc = provide(GetProjectUseCase)
    update_project_uc = provide(UpdateProjectUseCase)
    archive_project_uc = provide(ArchiveProjectUseCase)

    add_project_member_uc = provide(AddProjectMemberUseCase)
    list_project_members_uc = provide(ListProjectMembersUseCase)
    update_project_member_uc = provide(UpdateProjectMemberUseCase)
    remove_project_member_uc = provide(RemoveProjectMemberUseCase)

    get_project_config_uc = provide(GetProjectConfigUseCase)
    update_project_config_uc = provide(UpdateProjectConfigUseCase)
