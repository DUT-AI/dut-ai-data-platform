from dishka import Provider, Scope, provide
from domain.interfaces import IProjectRepository
from sqlalchemy.ext.asyncio import AsyncSession

from app.project.application.use_cases import (
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
from app.project.infrastructure.repository import ProjectRepository


class ProjectProvider(Provider):
    """Dishka DI Provider for Project feature module (Repositories & Use Cases)."""

    scope = Scope.REQUEST

    @provide
    def get_project_repository(self, session: AsyncSession) -> IProjectRepository:
        return ProjectRepository(session)

    create_project_uc = provide(CreateProjectUseCase)
    get_project_uc = provide(GetProjectUseCase)
    list_user_projects_uc = provide(ListUserProjectsUseCase)
    update_project_uc = provide(UpdateProjectUseCase)
    archive_project_uc = provide(ArchiveProjectUseCase)
    add_project_member_uc = provide(AddProjectMemberUseCase)
    list_project_members_uc = provide(ListProjectMembersUseCase)
    update_project_member_uc = provide(UpdateProjectMemberUseCase)
    remove_project_member_uc = provide(RemoveProjectMemberUseCase)
    get_project_config_uc = provide(GetProjectConfigUseCase)
    update_project_config_uc = provide(UpdateProjectConfigUseCase)
