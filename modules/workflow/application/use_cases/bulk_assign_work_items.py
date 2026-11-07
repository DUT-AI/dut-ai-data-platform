from datetime import UTC, datetime

from ulid import ULID

from modules.workflow.application.dtos.workflow_dtos import (
    AssignmentResponse,
    BulkAssignRequest,
)
from modules.workflow.domain.entities.workflow import (
    AssignmentEntity,
    WorkflowHistoryEntity,
    WorkItemStatus,
)
from modules.workflow.domain.exceptions.workflow_exceptions import (
    InvalidAssignmentError,
    WorkItemNotFoundError,
)
from modules.workflow.domain.interfaces.repositories import (
    IAssignmentRepository,
    IWorkflowHistoryRepository,
    IWorkItemRepository,
)
from modules.workflow.domain.services.transition_engine import TransitionEngine


class BulkAssignWorkItemsUseCase:
    def __init__(
        self,
        work_item_repo: IWorkItemRepository,
        assignment_repo: IAssignmentRepository,
        history_repo: IWorkflowHistoryRepository,
    ) -> None:
        self._work_item_repo = work_item_repo
        self._assignment_repo = assignment_repo
        self._history_repo = history_repo

    async def execute(self, request: BulkAssignRequest, assigned_by: int) -> list[AssignmentResponse]:
        if not request.assignee_ids:
            raise InvalidAssignmentError("At least one assignee_id must be provided.")
        if not request.work_item_ids:
            raise InvalidAssignmentError("At least one work_item_id must be provided.")

        now = datetime.now(UTC)
        assignments_to_create: list[AssignmentEntity] = []
        assignee_count = len(request.assignee_ids)

        for index, item_id in enumerate(request.work_item_ids):
            # Fetch work item with row-level lock
            work_item = await self._work_item_repo.get_by_id_for_update(item_id)
            if not work_item:
                raise WorkItemNotFoundError(item_id)

            # Round-robin user distribution
            assignee_id = request.assignee_ids[index % assignee_count]

            # Validate transition if moving from CREATED to ASSIGNED
            previous_status = work_item.status
            if previous_status != WorkItemStatus.ASSIGNED:
                TransitionEngine.validate_transition(previous_status, WorkItemStatus.ASSIGNED)
                work_item.status = WorkItemStatus.ASSIGNED

            if request.priority:
                work_item.priority = request.priority

            # Enrich work item metadata with active assignment info
            new_metadata = dict(work_item.metadata or {})
            new_metadata["assignee_id"] = assignee_id
            if request.due_date:
                new_metadata["due_date"] = request.due_date.isoformat()
            else:
                new_metadata.pop("due_date", None)
            new_metadata["assigned_at"] = now.isoformat()
            work_item.metadata = new_metadata

            work_item.updated_at = now
            await self._work_item_repo.update(work_item)

            # Deactivate previous active assignments for this item
            await self._assignment_repo.deactivate_previous(item_id)

            assignment = AssignmentEntity(
                id=str(ULID()),
                work_item_id=item_id,
                assignee_id=assignee_id,
                assigned_by=assigned_by,
                priority=work_item.priority,
                due_date=request.due_date,
                is_active=True,
                assigned_at=now,
            )
            assignments_to_create.append(assignment)

            # Record audit history if state transitioned
            if previous_status != WorkItemStatus.ASSIGNED:
                history = WorkflowHistoryEntity(
                    id=str(ULID()),
                    work_item_id=item_id,
                    from_state=previous_status,
                    to_state=WorkItemStatus.ASSIGNED,
                    changed_by=assigned_by,
                    comment=f"Phân công cho người dùng #{assignee_id}",
                    metadata={
                        "assignee_id": assignee_id,
                        "due_date": request.due_date.isoformat() if request.due_date else None,
                        "assigned_by": assigned_by,
                    },
                    changed_at=now,
                )
                await self._history_repo.append(history)

        created_assignments = await self._assignment_repo.create_bulk(assignments_to_create)

        return [
            AssignmentResponse(
                id=a.id,
                work_item_id=a.work_item_id,
                assignee_id=a.assignee_id,
                assigned_by=a.assigned_by,
                priority=a.priority,
                due_date=a.due_date,
                is_active=a.is_active,
                assigned_at=a.assigned_at,
            )
            for a in created_assignments
        ]
