from core.exceptions import NotFoundException
from core.utils.datetime_utils import now_utc
from modules.project.domain.events import IProjectEventPublisher, ProjectDomainEvent
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import ProjectResponseDTO


class ArchiveProjectUseCase:
    def __init__(
        self, repo: IProjectRepository, event_publisher: IProjectEventPublisher
    ) -> None:
        self.repo = repo
        self.event_publisher = event_publisher

    async def execute(self, project_id: str) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        changed = project.archive(now_utc())
        saved = await self.repo.save(project)
        if changed:
            await self.event_publisher.publish(
                ProjectDomainEvent(
                    event_type="ProjectArchived", project_id=saved.id, payload={}
                )
            )
        return ProjectResponseDTO.model_validate(saved)
