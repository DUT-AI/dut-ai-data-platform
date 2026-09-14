from core.exceptions import BadRequestException, NotFoundException
from modules.project.domain.events import IProjectEventPublisher, ProjectDomainEvent
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import ProjectConfigDTO


class UpdateProjectConfigUseCase:
    def __init__(
        self, repo: IProjectRepository, event_publisher: IProjectEventPublisher
    ) -> None:
        self.repo = repo
        self.event_publisher = event_publisher

    async def execute(self, project_id: str, data: dict) -> ProjectConfigDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")
        if project.status == "archived":
            raise BadRequestException(
                "Archived Project configuration cannot be updated."
            )
        config_keys = {
            "settings",
            "storage_provider_key",
            "default_workflow_ref",
            "settings_schema_version",
        }
        if not any(key in data for key in config_keys):
            data = {"settings": data}
        settings = data.get("settings", {})
        forbidden = ("password", "secret", "token", "api_key", "credential")

        def contains_secret(value: object) -> bool:
            if isinstance(value, dict):
                return any(
                    any(word in str(key).lower() for word in forbidden)
                    or contains_secret(nested)
                    for key, nested in value.items()
                )
            if isinstance(value, list):
                return any(contains_secret(item) for item in value)
            return False

        if contains_secret(settings):
            raise BadRequestException(
                "Project configuration must not contain credentials or secrets."
            )
        saved = await self.repo.save_configuration(project_id, data)
        await self.event_publisher.publish(
            ProjectDomainEvent(
                event_type="ProjectConfigurationUpdated",
                project_id=project_id,
                payload={"settings_schema_version": saved["settings_schema_version"]},
            )
        )
        return ProjectConfigDTO(project_id=project_id, **saved)
