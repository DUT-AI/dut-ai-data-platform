from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workflow.domain.entities.workflow import (
    WorkflowHistoryEntity,
    WorkItemStatus,
)
from modules.workflow.domain.interfaces.repositories import IWorkflowHistoryRepository
from modules.workflow.infrastructure.persistence.models import WorkflowHistoryModel


class WorkflowHistoryRepository(IWorkflowHistoryRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def append(self, history: WorkflowHistoryEntity) -> WorkflowHistoryEntity:
        model = self._to_model(history)
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def get_by_work_item(self, work_item_id: str) -> list[WorkflowHistoryEntity]:
        stmt = (
            select(WorkflowHistoryModel)
            .where(WorkflowHistoryModel.work_item_id == work_item_id)
            .order_by(WorkflowHistoryModel.changed_at.asc())
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    @staticmethod
    def _to_model(entity: WorkflowHistoryEntity) -> WorkflowHistoryModel:
        return WorkflowHistoryModel(
            id=entity.id,
            work_item_id=entity.work_item_id,
            from_state=entity.from_state.value,
            to_state=entity.to_state.value,
            changed_by=entity.changed_by,
            comment=entity.comment,
            metadata_=entity.metadata,
            changed_at=entity.changed_at,
        )

    @staticmethod
    def _to_entity(model: WorkflowHistoryModel) -> WorkflowHistoryEntity:
        return WorkflowHistoryEntity(
            id=model.id,
            work_item_id=model.work_item_id,
            from_state=WorkItemStatus(model.from_state),
            to_state=WorkItemStatus(model.to_state),
            changed_by=model.changed_by,
            comment=model.comment,
            metadata=model.metadata_ or {},
            changed_at=model.changed_at,
        )
