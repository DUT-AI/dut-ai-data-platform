from core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from core.utils.datetime_utils import now_utc
from modules.project.domain.access import IProjectAccessChecker
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository
from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity
from modules.project.domain.events import IProjectEventPublisher, ProjectDomainEvent
from modules.project.domain.interfaces import IProjectRepository
from modules.project.dtos.project_dtos import (
    ProjectConfigDTO,
    ProjectCreateDTO,
    ProjectMemberAddDTO,
    ProjectMemberResponseDTO,
    ProjectMemberUpdateDTO,
    ProjectResponseDTO,
    ProjectUpdateDTO,
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
        task_version_id = data.task_definition_version_id
        if not task_version_id and data.project_type:
            legacy_keys = {
                "detection": "cv.object_detection",
                "ocr": "cv.ocr",
                "classification": "cv.image_classification",
                "segmentation": "cv.semantic_segmentation",
                "nlp": "nlp.text_classification",
            }
            task = await self.catalog_repo.get_task_by_key(
                legacy_keys.get(data.project_type, data.project_type)
            )
            if task and task["versions"]:
                task_version_id = task["versions"][0]["id"]
        if not task_version_id:
            raise BadRequestException("Task Definition Version is required.")
        task_version = await self.catalog_repo.get_task_version(task_version_id)
        if not task_version:
            raise NotFoundException("Task Definition Version not found.")
        if task_version.status != "published":
            raise BadRequestException("Task Definition Version is not published.")
        template_version = None
        if data.project_template_version_id:
            template_version = await self.catalog_repo.get_template_version(
                data.project_template_version_id
            )
            if not template_version:
                raise NotFoundException("Project Template Version not found.")
            if template_version.status != "published":
                raise BadRequestException("Project Template Version is not published.")
            template = await self.catalog_repo.get_template(
                template_version.project_template_id
            )
            if (
                not template
                or template["task_definition_id"] != task_version.task_definition_id
            ):
                raise BadRequestException(
                    "Template does not belong to the selected Task Definition."
                )
            if not await self.catalog_repo.provider_supported(
                template_version.id, data.annotation_provider_key
            ):
                raise BadRequestException(
                    f"Provider '{data.annotation_provider_key}' is not supported by this template."
                )
        project = ProjectEntity(
            name=data.name,
            description=data.description,
            task_definition_version_id=task_version_id,
            project_template_version_id=data.project_template_version_id,
            created_by=owner_id,
        )
        saved = await self.repo.save(project)
        await self.repo.save_configuration(
            saved.id,
            {
                "annotation_provider_key": data.annotation_provider_key,
                "storage_provider_key": data.storage_provider_key,
                "settings": template_version.default_project_configuration
                if template_version
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
                    "task_definition_version_id": saved.task_definition_version_id,
                    "project_template_version_id": saved.project_template_version_id,
                },
            )
        )
        return ProjectResponseDTO.model_validate(saved)


class GetProjectUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, user_id: str | None = None
    ) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")
        return ProjectResponseDTO.model_validate(project)


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


class RestoreProjectUseCase:
    def __init__(
        self, repo: IProjectRepository, event_publisher: IProjectEventPublisher
    ) -> None:
        self.repo = repo
        self.event_publisher = event_publisher

    async def execute(self, project_id: str) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")
        changed = project.restore()
        saved = await self.repo.save(project)
        if changed:
            await self.event_publisher.publish(
                ProjectDomainEvent(
                    event_type="ProjectRestored", project_id=saved.id, payload={}
                )
            )
        return ProjectResponseDTO.model_validate(saved)


class AddProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, data: ProjectMemberAddDTO
    ) -> ProjectMemberResponseDTO:
        existing = await self.repo.get_member(project_id, data.user_id)
        if existing:
            raise ConflictException("User is already a member of this project.")

        member = ProjectMemberEntity(
            project_id=project_id,
            user_id=data.user_id,
            role=data.role,
            status="active",
        )
        saved = await self.repo.add_member(member)
        return ProjectMemberResponseDTO.model_validate(saved)


class ListProjectMembersUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> list[ProjectMemberResponseDTO]:
        members = await self.repo.list_members(project_id)
        return [ProjectMemberResponseDTO.model_validate(m) for m in members]


class UpdateProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, member_id: str, data: ProjectMemberUpdateDTO
    ) -> ProjectMemberResponseDTO:
        member = await self.repo.get_member(project_id, member_id)
        if not member:
            raise NotFoundException(f"Member '{member_id}' not found in project.")

        if data.role is not None:
            member.role = data.role
        if data.status is not None:
            member.status = data.status

        saved = await self.repo.update_member(member)
        return ProjectMemberResponseDTO.model_validate(saved)


class RemoveProjectMemberUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, member_id: str) -> None:
        member = await self.repo.get_member(project_id, member_id)
        if not member:
            raise NotFoundException(f"Member '{member_id}' not found in project.")
        if member.role == "owner":
            raise BadRequestException("Cannot remove project owner from project.")

        await self.repo.remove_member(project_id, member_id)


class GetProjectConfigUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> ProjectConfigDTO:
        cfg = await self.repo.get_configuration(project_id)
        if cfg is None:
            raise NotFoundException(
                f"Project configuration for '{project_id}' not found."
            )
        return ProjectConfigDTO(project_id=project_id, **cfg)


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
            "annotation_provider_key",
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
