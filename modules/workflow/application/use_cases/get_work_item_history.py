from modules.workflow.application.dtos.workflow_dtos import WorkflowHistoryResponse
from modules.workflow.domain.exceptions.workflow_exceptions import WorkItemNotFoundError
from modules.workflow.domain.interfaces.repositories import (
    IWorkflowHistoryRepository,
    IWorkItemRepository,
)


class GetWorkItemHistoryUseCase:
    def __init__(
        self,
        work_item_repo: IWorkItemRepository,
        history_repo: IWorkflowHistoryRepository,
    ) -> None:
        self._work_item_repo = work_item_repo
        self._history_repo = history_repo

    async def execute(self, work_item_id: str) -> list[WorkflowHistoryResponse]:
        work_item = await self._work_item_repo.get_by_id(work_item_id)
        if not work_item:
            raise WorkItemNotFoundError(work_item_id)

        records = await self._history_repo.get_by_work_item(work_item_id)
        return [
            WorkflowHistoryResponse(
                id=h.id,
                work_item_id=h.work_item_id,
                from_state=h.from_state,
                to_state=h.to_state,
                changed_by=h.changed_by,
                comment=h.comment,
                metadata=h.metadata,
                changed_at=h.changed_at,
            )
            for h in records
        ]
