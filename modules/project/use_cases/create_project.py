from modules.project.domain.catalog_interfaces import IProjectCatalogRepository
from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity
from modules.project.domain.events import IProjectEventPublisher, ProjectDomainEvent
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import (
    ProjectCreateDTO,
    ProjectResponseDTO,
)


class CreateProjectUseCase:
    def __init__(
        self,
        repo: IProjectRepository,
        catalog_repo: IProjectCatalogRepository,
        event_publisher: IProjectEventPublisher,
    ) -> None:
        self.repo = repo
        self.catalog_repo = catalog_repo
        self.event_publisher = event_publisher

    async def execute(
        self, data: ProjectCreateDTO, owner_id: str
    ) -> ProjectResponseDTO:
        template = None
        template_id = (
            data.template_id
            or data.project_template_version_id
            or data.task_definition_version_id
        )

        if template_id:
            template = await self.catalog_repo.get_template(template_id)
            if not template:
                template = await self.catalog_repo.get_template_by_key(template_id)

        project = ProjectEntity(
            name=data.name,
            description=data.description,
            template_id=template["id"] if template else template_id,
            created_by=owner_id,
        )
        saved = await self.repo.save(project)
        owner_member = ProjectMemberEntity(
            project_id=saved.id,
            user_id=owner_id,
            role="owner",
            status="active",
        )
        await self.repo.add_member(owner_member)
        await self.repo.save_configuration(
            saved.id,
            {
                "storage_provider_key": data.storage_provider_key,
                "settings": template.get("default_project_configuration", {})
                if template
                else {},
                "settings_schema_version": "1.0",
            },
        )
        await self.event_publisher.publish(
            ProjectDomainEvent(
                event_type="ProjectCreated",
                project_id=saved.id,
                payload={
                    "project_name": saved.name,
                    "created_by": saved.created_by,
                    "template_id": saved.template_id,
                },
            )
        )
        return ProjectResponseDTO.model_validate(saved)
