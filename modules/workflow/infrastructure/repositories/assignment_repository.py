
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from modules.workflow.domain.entities.workflow import AssignmentEntity, WorkItemPriority
from modules.workflow.domain.interfaces.repositories import IAssignmentRepository
from modules.workflow.infrastructure.persistence.models import AssignmentModel


class AssignmentRepository(IAssignmentRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, assignment: AssignmentEntity) -> AssignmentEntity:
        model = self._to_model(assignment)
        self._session.add(model)
        await self._session.flush()
        return self._to_entity(model)

    async def create_bulk(self, assignments: list[AssignmentEntity]) -> list[AssignmentEntity]:
        models = [self._to_model(a) for a in assignments]
        self._session.add_all(models)
        await self._session.flush()
        return [self._to_entity(m) for m in models]

    async def get_active_by_work_item(self, work_item_id: str) -> AssignmentEntity | None:
        stmt = (
            select(AssignmentModel)
            .where(
                AssignmentModel.work_item_id == work_item_id,
                AssignmentModel.is_active.is_(True),
            )
            .order_by(AssignmentModel.assigned_at.desc())
        )
        result = await self._session.execute(stmt)
        model = result.scalars().first()
        return self._to_entity(model) if model else None

    async def get_active_by_work_items(self, work_item_ids: list[str]) -> dict[str, AssignmentEntity]:
        if not work_item_ids:
            return {}
        stmt = (
            select(AssignmentModel)
            .where(
                AssignmentModel.work_item_id.in_(work_item_ids),
                AssignmentModel.is_active.is_(True),
            )
            .order_by(AssignmentModel.assigned_at.desc())
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        active_map: dict[str, AssignmentEntity] = {}
        for m in models:
            if m.work_item_id not in active_map:
                active_map[m.work_item_id] = self._to_entity(m)
        return active_map

    async def deactivate_previous(self, work_item_id: str) -> None:
        stmt = (
            update(AssignmentModel)
            .where(
                AssignmentModel.work_item_id == work_item_id,
                AssignmentModel.is_active.is_(True),
            )
            .values(is_active=False)
        )
        await self._session.execute(stmt)
        await self._session.flush()

    @staticmethod
    def _to_model(entity: AssignmentEntity) -> AssignmentModel:
        return AssignmentModel(
            id=entity.id,
            work_item_id=entity.work_item_id,
            assignee_id=entity.assignee_id,
            assigned_by=entity.assigned_by,
            priority=entity.priority.value,
            due_date=entity.due_date,
            is_active=entity.is_active,
            assigned_at=entity.assigned_at,
        )

    @staticmethod
    def _to_entity(model: AssignmentModel) -> AssignmentEntity:
        return AssignmentEntity(
            id=model.id,
            work_item_id=model.work_item_id,
            assignee_id=model.assignee_id,
            assigned_by=model.assigned_by,
            priority=WorkItemPriority(model.priority),
            due_date=model.due_date,
            is_active=model.is_active,
            assigned_at=model.assigned_at,
        )
