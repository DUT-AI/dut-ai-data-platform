from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from modules.workflow.domain.entities.workflow import WorkItemPriority, WorkItemStatus

# --- Workflow Definition DTOs ---

class CreateWorkflowDefinitionRequest(BaseModel):
    project_id: str = Field(..., description="Project ID")
    name: str = Field(..., description="Workflow name")
    description: str | None = Field(None, description="Optional description")
    config: dict[str, Any] = Field(default_factory=dict, description="Configuration parameters")


class WorkflowDefinitionResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: str | None = None
    config: dict[str, Any]
    created_at: datetime | None = None
    updated_at: datetime | None = None


# --- Work Item Batch Creation DTOs ---

class BatchItemSpec(BaseModel):
    batch_id: str = Field(..., description="Unique identifier for this batch")
    asset_ids: list[str] = Field(..., description="List of asset IDs included in the batch")


class CreateBatchWorkItemsRequest(BaseModel):
    workflow_id: str = Field(..., description="Workflow Definition ID")
    project_id: str = Field(..., description="Project ID")
    resource_type: str = Field("ANNOTATION_BATCH", description="Resource type tag")
    batches: list[BatchItemSpec] = Field(..., description="List of batches to create")
    priority: WorkItemPriority = Field(WorkItemPriority.MEDIUM, description="Initial priority")
    dataset_id: str | None = Field(None, description="Optional source dataset ID for provenance")
    dataset_version_id: str | None = Field(None, description="Optional source dataset version ID for provenance")
    dataset_name: str | None = Field(None, description="Optional source dataset name for display")
    dataset_version_name: str | None = Field(None, description="Optional source dataset version name for display")


class WorkItemResponse(BaseModel):
    id: str
    workflow_id: str
    project_id: str
    resource_type: str
    resource_id: str
    status: WorkItemStatus
    priority: WorkItemPriority
    metadata: dict[str, Any]
    assignee_id: int | None = None
    due_date: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


# --- Assignment & Transition DTOs ---

class BulkAssignRequest(BaseModel):
    work_item_ids: list[str] = Field(..., description="List of Work Item IDs to assign")
    assignee_ids: list[int] = Field(..., description="List of user IDs to distribute work across")
    due_date: datetime | None = Field(None, description="Optional deadline")
    priority: WorkItemPriority | None = Field(None, description="Optional priority override")


class TransitionWorkItemRequest(BaseModel):
    target_status: WorkItemStatus = Field(..., description="Requested destination status")
    comment: str | None = Field(None, description="Optional review comment or note")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Contextual metadata")


class AssignmentResponse(BaseModel):
    id: str
    work_item_id: str
    assignee_id: int
    assigned_by: int
    priority: WorkItemPriority
    due_date: datetime | None = None
    is_active: bool
    assigned_at: datetime | None = None


class WorkflowHistoryResponse(BaseModel):
    id: str
    work_item_id: str
    from_state: WorkItemStatus
    to_state: WorkItemStatus
    changed_by: int
    comment: str | None = None
    metadata: dict[str, Any]
    changed_at: datetime | None = None


class AddWorkItemCommentRequest(BaseModel):
    comment: str
    metadata: dict[str, Any] = Field(default_factory=dict)


class RecordAssetReviewRequest(BaseModel):
    asset_id: str
    status: str  # "APPROVED" | "NEEDS_REVISION"
    comment: str | None = None
    asset_filename: str | None = None

