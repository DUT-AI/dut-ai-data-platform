from datetime import UTC, datetime

from ulid import ULID

from modules.workflow.application.dtos.workflow_dtos import (
    CreateBatchWorkItemsRequest,
    WorkItemResponse,
)
from modules.workflow.domain.entities.workflow import (
    WorkflowDefinitionEntity,
    WorkItemEntity,
    WorkItemStatus,
)
from modules.workflow.domain.interfaces.repositories import (
    IWorkflowDefinitionRepository,
    IWorkItemRepository,
)


class CreateBatchWorkItemsUseCase:
    def __init__(
        self,
        work_item_repo: IWorkItemRepository,
        workflow_repo: IWorkflowDefinitionRepository,
    ) -> None:
        self._work_item_repo = work_item_repo
        self._workflow_repo = workflow_repo

    async def execute(self, request: CreateBatchWorkItemsRequest) -> list[WorkItemResponse]:
        # Validate that workflow exists (or fallback to project's workflow definition)
        workflow = await self._workflow_repo.get_by_id(request.workflow_id)
        if not workflow:
            workflow = await self._workflow_repo.get_by_project_id(request.project_id)
            if not workflow:
                now = datetime.now(UTC)
                workflow = await self._workflow_repo.create(
                    WorkflowDefinitionEntity(
                        id=str(ULID()),
                        project_id=request.project_id,
                        name="Standard Project Workflow",
                        description="Default labeling & review lifecycle",
                        config={},
                        created_at=now,
                        updated_at=now,
                    )
                )

        now = datetime.now(UTC)
        items_to_create: list[WorkItemEntity] = []

        for batch_spec in request.batches:
            metadata: dict[str, object] = {
                "asset_ids": batch_spec.asset_ids,
                "item_count": len(batch_spec.asset_ids),
            }
            if request.dataset_id:
                metadata["dataset_id"] = request.dataset_id
            if request.dataset_version_id:
                metadata["dataset_version_id"] = request.dataset_version_id
            if request.dataset_name:
                metadata["dataset_name"] = request.dataset_name
            if request.dataset_version_name:
                metadata["dataset_version_name"] = request.dataset_version_name

            item = WorkItemEntity(
                id=str(ULID()),
                workflow_id=workflow.id,
                project_id=request.project_id,
                resource_type=request.resource_type,
                resource_id=batch_spec.batch_id,
                status=WorkItemStatus.CREATED,
                priority=request.priority,
                metadata=metadata,
                created_at=now,
                updated_at=now,
            )
            items_to_create.append(item)

        created_items = await self._work_item_repo.create_batch(items_to_create)

        return [
            WorkItemResponse(
                id=item.id,
                workflow_id=item.workflow_id,
                project_id=item.project_id,
                resource_type=item.resource_type,
                resource_id=item.resource_id,
                status=item.status,
                priority=item.priority,
                metadata=item.metadata,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
            for item in created_items
        ]
