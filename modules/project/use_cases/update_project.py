from core.exceptions import BadRequestException, NotFoundException
from modules.project.domain.events import IProjectEventPublisher, ProjectDomainEvent
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import ProjectResponseDTO, ProjectUpdateDTO


class UpdateProjectUseCase:
    def __init__(
        self, repo: IProjectRepository, event_publisher: IProjectEventPublisher
    ) -> None:
        self.repo = repo
        self.event_publisher = event_publisher

    async def execute(
        self, project_id: str, data: ProjectUpdateDTO
    ) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")
        if project.status == "archived":
            raise BadRequestException("Archived Project cannot be updated.")

        if data.name is not None:
            project.name = data.name
        if data.description is not None:
            project.description = data.description
        saved = await self.repo.save(project)
        await self.event_publisher.publish(
            ProjectDomainEvent(
                event_type="ProjectUpdated",
                project_id=saved.id,
                payload={"updated_fields": list(data.model_fields_set)},
            )
        )
        return ProjectResponseDTO.model_validate(saved)
