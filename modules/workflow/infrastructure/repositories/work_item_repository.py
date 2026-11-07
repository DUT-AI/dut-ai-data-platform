
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workflow.domain.entities.workflow import (
    WorkItemEntity,
    WorkItemPriority,
    WorkItemStatus,
)
from modules.workflow.domain.interfaces.repositories import IWorkItemRepository
from modules.workflow.infrastructure.persistence.models import (
    AssignmentModel,
    WorkItemModel,
)


class WorkItemRepository(IWorkItemRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, item: WorkItemEntity) -> WorkItemEntity:
        model = self._to_model(item)
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def create_batch(self, items: list[WorkItemEntity]) -> list[WorkItemEntity]:
        models = [self._to_model(item) for item in items]
        self._session.add_all(models)
        await self._session.flush()
        return [self._to_entity(m) for m in models]

    async def get_by_id(self, item_id: str) -> WorkItemEntity | None:
        stmt = select(WorkItemModel).where(WorkItemModel.id == item_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_id_for_update(self, item_id: str) -> WorkItemEntity | None:
        stmt = select(WorkItemModel).where(WorkItemModel.id == item_id).with_for_update()
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_by_filter(
        self,
        project_id: str,
        workflow_id: str | None = None,
        status: WorkItemStatus | None = None,
        assignee_id: int | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[WorkItemEntity], int]:
        query = select(WorkItemModel).where(WorkItemModel.project_id == project_id)

        if workflow_id:
            query = query.where(WorkItemModel.workflow_id == workflow_id)
        if status:
            query = query.where(WorkItemModel.status == status.value)
        if assignee_id is not None:
            query = query.join(AssignmentModel, WorkItemModel.id == AssignmentModel.work_item_id).where(
                AssignmentModel.assignee_id == assignee_id,
                AssignmentModel.is_active.is_(True),
            )

        # Count total
        count_stmt = select(func.count()).select_from(query.subquery())
        total = (await self._session.execute(count_stmt)).scalar() or 0

        # Paginate
        query = query.order_by(WorkItemModel.created_at.desc()).limit(limit).offset(offset)
        result = await self._session.execute(query)
        models = result.scalars().all()

        return [self._to_entity(m) for m in models], total

    async def update(self, item: WorkItemEntity) -> WorkItemEntity:
        stmt = select(WorkItemModel).where(WorkItemModel.id == item.id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if model:
            model.status = item.status.value
            model.priority = item.priority.value
            model.metadata_ = item.metadata
            model.updated_at = item.updated_at
            await self._session.flush()
            return self._to_entity(model)
        return item

    @staticmethod
    def _to_model(entity: WorkItemEntity) -> WorkItemModel:
        return WorkItemModel(
            id=entity.id,
            workflow_id=entity.workflow_id,
            project_id=entity.project_id,
            resource_type=entity.resource_type,
            resource_id=entity.resource_id,
            status=entity.status.value,
            priority=entity.priority.value,
            metadata_=entity.metadata,
            created_at=entity.created_at,
            updated_at=entity.updated_at,
        )

    @staticmethod
    def _to_entity(model: WorkItemModel) -> WorkItemEntity:
        return WorkItemEntity(
            id=model.id,
            workflow_id=model.workflow_id,
            project_id=model.project_id,
            resource_type=model.resource_type,
            resource_id=model.resource_id,
            status=WorkItemStatus(model.status),
            priority=WorkItemPriority(model.priority),
            metadata=model.metadata_ or {},
            created_at=model.created_at,
            updated_at=model.updated_at,
        )
