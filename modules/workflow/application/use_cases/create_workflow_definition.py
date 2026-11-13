from datetime import UTC, datetime

from ulid import ULID

from modules.workflow.application.dtos.workflow_dtos import (
    CreateWorkflowDefinitionRequest,
    WorkflowDefinitionResponse,
)
from modules.workflow.domain.entities.workflow import WorkflowDefinitionEntity
from modules.workflow.domain.interfaces.repositories import (
    IWorkflowDefinitionRepository,
)


class CreateWorkflowDefinitionUseCase:
    def __init__(self, repository: IWorkflowDefinitionRepository) -> None:
        self._repository = repository

    async def execute(self, request: CreateWorkflowDefinitionRequest) -> WorkflowDefinitionResponse:
        existing = await self._repository.get_by_project_id(request.project_id)
        if existing:
            return WorkflowDefinitionResponse(
                id=existing.id,
                project_id=existing.project_id,
                name=existing.name,
                description=existing.description,
                config=existing.config,
                created_at=existing.created_at,
                updated_at=existing.updated_at,
            )

        now = datetime.now(UTC)
        entity = WorkflowDefinitionEntity(
            id=str(ULID()),
            project_id=request.project_id,
            name=request.name,
            description=request.description,
            config=request.config,
            created_at=now,
            updated_at=now,
        )
        saved = await self._repository.create(entity)
        return WorkflowDefinitionResponse(
            id=saved.id,
            project_id=saved.project_id,
            name=saved.name,
            description=saved.description,
            config=saved.config,
            created_at=saved.created_at,
            updated_at=saved.updated_at,
        )
