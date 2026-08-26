from core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from modules.project.domain.entities import ProjectEntity, ProjectMemberEntity
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
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, data: ProjectCreateDTO, owner_id: str
    ) -> ProjectResponseDTO:
        project = ProjectEntity(
            name=data.name,
            project_type=data.project_type,
            owner_id=owner_id,
            description=data.description,
        )
        saved = await self.repo.save(project)

        # Automatically add creator as owner member
        owner_member = ProjectMemberEntity(
            project_id=saved.id,
            user_id=owner_id,
            role="owner",
            status="active",
        )
        await self.repo.add_member(owner_member)
        return ProjectResponseDTO.model_validate(saved)


class GetProjectUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, user_id: str) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")
        return ProjectResponseDTO.model_validate(project)


class ListUserProjectsUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, user_id: str, page: int = 1, page_size: int = 20
    ) -> list[ProjectResponseDTO]:
        offset = (page - 1) * page_size
        projects = await self.repo.list_by_user(user_id, offset=offset, limit=page_size)
        return [ProjectResponseDTO.model_validate(p) for p in projects]


class UpdateProjectUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(
        self, project_id: str, data: ProjectUpdateDTO
    ) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        if data.name is not None:
            project.name = data.name
        if data.description is not None:
            project.description = data.description
        if data.status is not None:
            project.status = data.status

        saved = await self.repo.save(project)
        return ProjectResponseDTO.model_validate(saved)


class ArchiveProjectUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> ProjectResponseDTO:
        project = await self.repo.get_by_id(project_id)
        if not project:
            raise NotFoundException(f"Project '{project_id}' not found.")

        project.archive()
        saved = await self.repo.save(project)
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
        return ProjectConfigDTO(project_id=project_id, settings=cfg or {})


class UpdateProjectConfigUseCase:
    def __init__(self, repo: IProjectRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str, data: dict) -> ProjectConfigDTO:
        saved = await self.repo.save_configuration(project_id, data)
        return ProjectConfigDTO(project_id=project_id, settings=saved)
