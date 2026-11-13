from datetime import UTC, datetime

from ulid import ULID

from modules.workflow.application.dtos.workflow_dtos import (
    TransitionWorkItemRequest,
    WorkItemResponse,
)
from modules.workflow.domain.entities.workflow import (
    WorkflowHistoryEntity,
    WorkItemStatus,
)
from modules.workflow.domain.exceptions.workflow_exceptions import WorkItemNotFoundError
from modules.workflow.domain.interfaces.repositories import (
    IAssignmentRepository,
    IWorkflowHistoryRepository,
    IWorkItemRepository,
)
from modules.workflow.domain.services.transition_engine import TransitionEngine


class TransitionWorkItemUseCase:
    def __init__(
        self,
        work_item_repo: IWorkItemRepository,
        history_repo: IWorkflowHistoryRepository,
        assignment_repo: IAssignmentRepository | None = None,
    ) -> None:
        self._work_item_repo = work_item_repo
        self._history_repo = history_repo
        self._assignment_repo = assignment_repo

    async def execute(
        self,
        work_item_id: str,
        request: TransitionWorkItemRequest,
        actor_id: int,
    ) -> WorkItemResponse:
        # Acquire row-level lock
        work_item = await self._work_item_repo.get_by_id_for_update(work_item_id)
        if not work_item:
            raise WorkItemNotFoundError(work_item_id)

        from_state = work_item.status
        to_state = request.target_status

        # Validate with TransitionEngine (raises InvalidStateTransitionError on prohibited jumps)
        TransitionEngine.validate_transition(from_state, to_state)

        now = datetime.now(UTC)

        # If reverting/unassigning back to CREATED, deactivate any active assignments
        if to_state == WorkItemStatus.CREATED and self._assignment_repo:
            await self._assignment_repo.deactivate_previous(work_item_id)
            new_metadata = dict(work_item.metadata or {})
            new_metadata.pop("assignee_id", None)
            new_metadata.pop("due_date", None)
            new_metadata.pop("assigned_at", None)
            work_item.metadata = new_metadata

        # Update WorkItem status
        work_item.status = to_state
        work_item.updated_at = now
        updated_item = await self._work_item_repo.update(work_item)

        # Append immutable audit history
        history = WorkflowHistoryEntity(
            id=str(ULID()),
            work_item_id=work_item_id,
            from_state=from_state,
            to_state=to_state,
            changed_by=actor_id,
            comment=request.comment,
            metadata=request.metadata,
            changed_at=now,
        )
        await self._history_repo.append(history)

        # Resolve active assignment info if present
        assignee_id: int | None = None
        due_date: datetime | None = None
        if to_state != WorkItemStatus.CREATED and self._assignment_repo:
            active_assign = await self._assignment_repo.get_active_by_work_item(work_item_id)
            if active_assign:
                assignee_id = active_assign.assignee_id
                due_date = active_assign.due_date

        return WorkItemResponse(
            id=updated_item.id,
            workflow_id=updated_item.workflow_id,
            project_id=updated_item.project_id,
            resource_type=updated_item.resource_type,
            resource_id=updated_item.resource_id,
            status=updated_item.status,
            priority=updated_item.priority,
            metadata=updated_item.metadata,
            assignee_id=assignee_id,
            due_date=due_date,
            created_at=updated_item.created_at,
            updated_at=updated_item.updated_at,
        )
