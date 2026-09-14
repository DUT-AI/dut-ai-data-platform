from modules.project.domain.access import IProjectAccessChecker
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import ProjectResponseDTO


class ListUserProjectsUseCase:
    def __init__(
        self, repo: IProjectRepository, access_checker: IProjectAccessChecker
    ) -> None:
        self.repo = repo
        self.access_checker = access_checker

    async def execute(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
        task_definition_version_id: str | None = None,
        search: str | None = None,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> list[ProjectResponseDTO]:
        offset = (page - 1) * page_size
        accessible_ids = await self.access_checker.accessible_project_ids(user_id)
        projects = await self.repo.list_projects(
            offset=offset,
            limit=page_size,
            status=status,
            task_definition_version_id=task_definition_version_id,
            search=search,
            sort_by=sort_by,
            sort_order=sort_order,
            accessible_project_ids=accessible_ids,
            created_by=user_id,
        )
        return [ProjectResponseDTO.model_validate(p) for p in projects]
