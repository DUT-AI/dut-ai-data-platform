
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workflow.domain.entities.workflow import WorkflowDefinitionEntity
from modules.workflow.domain.interfaces.repositories import (
    IWorkflowDefinitionRepository,
)
from modules.workflow.infrastructure.persistence.models import WorkflowDefinitionModel


class WorkflowDefinitionRepository(IWorkflowDefinitionRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, definition: WorkflowDefinitionEntity) -> WorkflowDefinitionEntity:
        model = WorkflowDefinitionModel(
            id=definition.id,
            project_id=definition.project_id,
            name=definition.name,
            description=definition.description,
            config=definition.config,
            created_at=definition.created_at,
            updated_at=definition.updated_at,
        )
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def get_by_id(self, workflow_id: str) -> WorkflowDefinitionEntity | None:
        stmt = select(WorkflowDefinitionModel).where(WorkflowDefinitionModel.id == workflow_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_project_id(self, project_id: str) -> WorkflowDefinitionEntity | None:
        stmt = (
            select(WorkflowDefinitionModel)
            .where(WorkflowDefinitionModel.project_id == project_id)
            .order_by(WorkflowDefinitionModel.created_at.desc())
        )
        result = await self._session.execute(stmt)
        model = result.scalars().first()
        return self._to_entity(model) if model else None

    @staticmethod
    def _to_entity(model: WorkflowDefinitionModel) -> WorkflowDefinitionEntity:
        return WorkflowDefinitionEntity(
            id=model.id,
            project_id=model.project_id,
            name=model.name,
            description=model.description,
            config=model.config or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
