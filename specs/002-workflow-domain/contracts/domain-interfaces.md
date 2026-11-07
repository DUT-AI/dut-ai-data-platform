# Domain Contracts & Interfaces: Workflow Domain

**Feature**: `002-workflow-domain` | **Date**: 2026-11-04

All interfaces are pure Python Protocols (`typing.Protocol`) with zero third-party dependencies.

```python
from typing import Protocol, Optional
from modules.workflow.domain.entities.workflow import (
    WorkflowDefinitionEntity,
    WorkItemEntity,
    AssignmentEntity,
    WorkflowHistoryEntity,
    WorkItemStatus,
)


class IWorkflowDefinitionRepository(Protocol):
    async def create(self, definition: WorkflowDefinitionEntity) -> WorkflowDefinitionEntity: ...
    async def get_by_id(self, workflow_id: str) -> Optional[WorkflowDefinitionEntity]: ...
    async def get_by_project_id(self, project_id: str) -> Optional[WorkflowDefinitionEntity]: ...


class IWorkItemRepository(Protocol):
    async def create(self, item: WorkItemEntity) -> WorkItemEntity: ...
    async def create_batch(self, items: list[WorkItemEntity]) -> list[WorkItemEntity]: ...
    async def get_by_id(self, item_id: str) -> Optional[WorkItemEntity]: ...
    async def get_by_id_for_update(self, item_id: str) -> Optional[WorkItemEntity]: ...
    async def list_by_filter(
        self,
        project_id: str,
        workflow_id: Optional[str] = None,
        status: Optional[WorkItemStatus] = None,
        assignee_id: Optional[int] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[WorkItemEntity], int]: ...
    async def update(self, item: WorkItemEntity) -> WorkItemEntity: ...


class IAssignmentRepository(Protocol):
    async def create(self, assignment: AssignmentEntity) -> AssignmentEntity: ...
    async def create_bulk(self, assignments: list[AssignmentEntity]) -> list[AssignmentEntity]: ...
    async def get_active_by_work_item(self, work_item_id: str) -> Optional[AssignmentEntity]: ...
    async def deactivate_previous(self, work_item_id: str) -> None: ...


class IWorkflowHistoryRepository(Protocol):
    async def append(self, history: WorkflowHistoryEntity) -> WorkflowHistoryEntity: ...
    async def get_by_work_item(self, work_item_id: str) -> list[WorkflowHistoryEntity]: ...


class ITransitionEngine(Protocol):
    def validate_transition(
        self,
        current_status: WorkItemStatus,
        target_status: WorkItemStatus,
    ) -> None:
        """Validates if current -> target is allowed. Raises InvalidStateTransitionError if prohibited."""
        ...
```

