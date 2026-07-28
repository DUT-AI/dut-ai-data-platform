from dishka import Provider, Scope, provide
from domain.interfaces import IProjectRepository
from sqlalchemy.ext.asyncio import AsyncSession

from app.project.application.use_cases import (
    CreateProjectUseCase,
    GetProjectUseCase,
    ListUserProjectsUseCase,
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
