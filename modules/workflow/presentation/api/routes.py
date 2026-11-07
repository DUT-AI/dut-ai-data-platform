
from datetime import UTC, datetime

from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, HTTPException, Query, status

from apps.api.deps.auth import get_current_user
from core.utils.id_generator import generate_ulid
from modules.identity.domain.entities import AuthUser
from modules.workflow.application.dtos.workflow_dtos import (
    AddWorkItemCommentRequest,
    AssignmentResponse,
    BulkAssignRequest,
    CreateBatchWorkItemsRequest,
    CreateWorkflowDefinitionRequest,
    RecordAssetReviewRequest,
    TransitionWorkItemRequest,
    WorkflowDefinitionResponse,
    WorkflowHistoryResponse,
    WorkItemResponse,
)
from modules.workflow.application.use_cases.bulk_assign_work_items import (
    BulkAssignWorkItemsUseCase,
)
from modules.workflow.application.use_cases.create_batch_work_items import (
    CreateBatchWorkItemsUseCase,
)
from modules.workflow.application.use_cases.create_workflow_definition import (
    CreateWorkflowDefinitionUseCase,
)
from modules.workflow.application.use_cases.get_work_item_history import (
    GetWorkItemHistoryUseCase,
)
from modules.workflow.application.use_cases.transition_work_item import (
    TransitionWorkItemUseCase,
)
from modules.workflow.domain.entities.workflow import (
    WorkflowHistoryEntity,
    WorkItemStatus,
)
from modules.workflow.domain.exceptions.workflow_exceptions import (
    InvalidStateTransitionError,
    WorkflowDefinitionNotFoundError,
    WorkflowDomainException,
    WorkItemNotFoundError,
)
from modules.workflow.domain.interfaces.repositories import (
    IAssignmentRepository,
    IWorkflowDefinitionRepository,
    IWorkflowHistoryRepository,
    IWorkItemRepository,
)

router = APIRouter(prefix="/api/v1", tags=["Workflow Management"])


def get_current_user_id(current_user: AuthUser = Depends(get_current_user)) -> int:
    return current_user.id


# --- Workflow Definition Endpoints ---

@router.post(
    "/workflows",
    response_model=WorkflowDefinitionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new workflow definition",
)
@inject
async def create_workflow(
    request: CreateWorkflowDefinitionRequest,
    use_case: FromDishka[CreateWorkflowDefinitionUseCase],
    current_user_id: int = Depends(get_current_user_id),
):
    try:
        return await use_case.execute(request)
    except WorkflowDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/workflows/{workflow_id}",
    response_model=WorkflowDefinitionResponse,
    summary="Get workflow definition by ID",
)
@inject
async def get_workflow(
    workflow_id: str,
    repo: FromDishka[IWorkflowDefinitionRepository],
    current_user_id: int = Depends(get_current_user_id),
):
    wf = await repo.get_by_id(workflow_id)
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow definition not found")
    return WorkflowDefinitionResponse(
        id=wf.id,
        project_id=wf.project_id,
        name=wf.name,
        description=wf.description,
        config=wf.config,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
    )


@router.get(
    "/projects/{project_id}/workflow",
    response_model=WorkflowDefinitionResponse,
    summary="Get workflow definition by Project ID",
)
@inject
async def get_project_workflow(
    project_id: str,
    repo: FromDishka[IWorkflowDefinitionRepository],
    current_user_id: int = Depends(get_current_user_id),
):
    wf = await repo.get_by_project_id(project_id)
    if not wf:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow definition not found for this project")
    return WorkflowDefinitionResponse(
        id=wf.id,
        project_id=wf.project_id,
        name=wf.name,
        description=wf.description,
        config=wf.config,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
    )


# --- Work Item Endpoints ---

@router.post(
    "/work-items/batches",
    response_model=list[WorkItemResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Initialize batched work items from dataset assets",
)
@inject
async def create_batch_work_items(
    request: CreateBatchWorkItemsRequest,
    use_case: FromDishka[CreateBatchWorkItemsUseCase],
    current_user_id: int = Depends(get_current_user_id),
):
    try:
        return await use_case.execute(request)
    except WorkflowDefinitionNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkflowDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khởi tạo lô: {e}",
        )


@router.post(
    "/work-items/bulk-assign",
    response_model=list[AssignmentResponse],
    summary="Bulk assign work items across annotators",
)
@inject
async def bulk_assign_work_items(
    request: BulkAssignRequest,
    use_case: FromDishka[BulkAssignWorkItemsUseCase],
    current_user_id: int = Depends(get_current_user_id),
):
    try:
        return await use_case.execute(request, assigned_by=current_user_id)
    except WorkItemNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except WorkflowDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/work-items/{work_item_id}/transition",
    response_model=WorkItemResponse,
    summary="Advance work item lifecycle state",
)
@inject
async def transition_work_item(
    work_item_id: str,
    request: TransitionWorkItemRequest,
    use_case: FromDishka[TransitionWorkItemUseCase],
    current_user_id: int = Depends(get_current_user_id),
):
    try:
        return await use_case.execute(work_item_id, request, actor_id=current_user_id)
    except WorkItemNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except WorkflowDomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/work-items",
    response_model=list[WorkItemResponse],
    summary="List and filter work items",
)
@inject
async def list_work_items(
    project_id: str = Query(..., description="Project ID"),
    workflow_id: str | None = Query(None, description="Workflow ID"),
    status: WorkItemStatus | None = Query(None, description="Status filter"),
    assignee_id: int | None = Query(None, description="Assignee User ID"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    repo: FromDishka[IWorkItemRepository] = None,
    assignment_repo: FromDishka[IAssignmentRepository] = None,
    current_user_id: int = Depends(get_current_user_id),
):
    items, _ = await repo.list_by_filter(
        project_id=project_id,
        workflow_id=workflow_id,
        status=status,
        assignee_id=assignee_id,
        limit=limit,
        offset=offset,
    )

    # Query active assignments for these items to resolve assignee and deadline
    item_ids = [item.id for item in items]
    active_assignments = await assignment_repo.get_active_by_work_items(item_ids)

    response_items: list[WorkItemResponse] = []
    for item in items:
        active_assign = active_assignments.get(item.id)
        assignee = active_assign.assignee_id if active_assign else (item.metadata or {}).get("assignee_id")
        due = active_assign.due_date if active_assign else None

        meta = dict(item.metadata or {})
        if assignee is not None and "assignee_id" not in meta:
            meta["assignee_id"] = assignee
        if due is not None and "due_date" not in meta:
            meta["due_date"] = due.isoformat()

        response_items.append(
            WorkItemResponse(
                id=item.id,
                workflow_id=item.workflow_id,
                project_id=item.project_id,
                resource_type=item.resource_type,
                resource_id=item.resource_id,
                status=item.status,
                priority=item.priority,
                metadata=meta,
                assignee_id=assignee,
                due_date=due,
                created_at=item.created_at,
                updated_at=item.updated_at,
            )
        )

    return response_items


@router.get(
    "/work-items/{work_item_id}",
    response_model=WorkItemResponse,
    summary="Get single work item detail",
)
@inject
async def get_work_item(
    work_item_id: str,
    repo: FromDishka[IWorkItemRepository],
    assignment_repo: FromDishka[IAssignmentRepository],
    current_user_id: int = Depends(get_current_user_id),
):
    item = await repo.get_by_id(work_item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found"
        )
    active_assignments = await assignment_repo.get_active_by_work_items([item.id])
    active_assign = active_assignments.get(item.id)
    assignee = (
        active_assign.assignee_id
        if active_assign
        else (item.metadata or {}).get("assignee_id")
    )
    due = active_assign.due_date if active_assign else None

    meta = dict(item.metadata or {})
    if assignee is not None and "assignee_id" not in meta:
        meta["assignee_id"] = assignee
    if due is not None and "due_date" not in meta:
        meta["due_date"] = due.isoformat()

    return WorkItemResponse(
        id=item.id,
        workflow_id=item.workflow_id,
        project_id=item.project_id,
        resource_type=item.resource_type,
        resource_id=item.resource_id,
        status=item.status,
        priority=item.priority,
        metadata=meta,
        assignee_id=assignee,
        due_date=due,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


@router.get(
    "/work-items/{work_item_id}/history",
    response_model=list[WorkflowHistoryResponse],
    summary="Get full audit history for a work item",
)
@inject
async def get_work_item_history(
    work_item_id: str,
    use_case: FromDishka[GetWorkItemHistoryUseCase],
    current_user_id: int = Depends(get_current_user_id),
):
    try:
        return await use_case.execute(work_item_id)
    except WorkItemNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post(
    "/work-items/{work_item_id}/comments",
    response_model=WorkflowHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add reviewer comment or note to work item without changing status",
)
@inject
async def add_work_item_comment(
    work_item_id: str,
    payload: AddWorkItemCommentRequest,
    repo: FromDishka[IWorkItemRepository],
    history_repo: FromDishka[IWorkflowHistoryRepository],
    current_user_id: int = Depends(get_current_user_id),
):
    item = await repo.get_by_id(work_item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found"
        )
    if not payload.comment.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Comment cannot be empty"
        )

    meta = dict(payload.metadata or {})
    meta.setdefault("type", "REVIEW_COMMENT")

    history_entity = WorkflowHistoryEntity(
        id=generate_ulid(),
        work_item_id=item.id,
        from_state=item.status,
        to_state=item.status,
        changed_by=current_user_id,
        comment=payload.comment.strip(),
        metadata=meta,
        changed_at=datetime.now(UTC),
    )
    saved = await history_repo.append(history_entity)
    return WorkflowHistoryResponse(
        id=saved.id,
        work_item_id=saved.work_item_id,
        from_state=saved.from_state,
        to_state=saved.to_state,
        changed_by=saved.changed_by,
        comment=saved.comment,
        metadata=saved.metadata,
        changed_at=saved.changed_at,
    )


@router.post(
    "/work-items/{work_item_id}/asset-reviews",
    response_model=WorkItemResponse,
    status_code=status.HTTP_200_OK,
    summary="Record per-asset review status and feedback comment",
)
@inject
async def record_asset_review(
    work_item_id: str,
    payload: RecordAssetReviewRequest,
    repo: FromDishka[IWorkItemRepository],
    assignment_repo: FromDishka[IAssignmentRepository],
    current_user_id: int = Depends(get_current_user_id),
):
    item = await repo.get_by_id(work_item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Work item not found"
        )
    if payload.status not in ("APPROVED", "NEEDS_REVISION", "FIXED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'APPROVED', 'NEEDS_REVISION', or 'FIXED'",
        )

    meta = dict(item.metadata or {})
    asset_reviews = dict(meta.get("asset_reviews") or {})
    existing = dict(asset_reviews.get(payload.asset_id) or {})

    review_data = {
        "status": payload.status,
        "comment": payload.comment.strip() if payload.comment else existing.get("comment"),
        "asset_filename": payload.asset_filename or existing.get("asset_filename"),
        "reviewed_at": existing.get("reviewed_at") or datetime.now(UTC).isoformat(),
        "reviewer_id": existing.get("reviewer_id") if payload.status == "FIXED" else current_user_id,
    }
    if payload.status == "FIXED":
        review_data["fixed_at"] = datetime.now(UTC).isoformat()
        review_data["fixed_by"] = current_user_id
    elif payload.status in ("APPROVED", "NEEDS_REVISION"):
        review_data["reviewer_id"] = current_user_id
        review_data["reviewed_at"] = datetime.now(UTC).isoformat()
        review_data.pop("fixed_at", None)
        review_data.pop("fixed_by", None)

    asset_reviews[payload.asset_id] = review_data
    meta["asset_reviews"] = asset_reviews
    item.metadata = meta
    item.updated_at = datetime.now(UTC)

    saved = await repo.update(item)

    # Get active assignee and due date for response
    active_assignments = await assignment_repo.get_active_by_work_items([saved.id])
    active = active_assignments.get(saved.id)
    assignee = (
        active.assignee_id
        if active
        else (saved.metadata or {}).get("assignee_id")
    )
    due = active.due_date if active else None

    meta = dict(saved.metadata or {})
    if assignee is not None and "assignee_id" not in meta:
        meta["assignee_id"] = assignee
    if due is not None and "due_date" not in meta:
        meta["due_date"] = due.isoformat()

    return WorkItemResponse(
        id=saved.id,
        workflow_id=saved.workflow_id,
        project_id=saved.project_id,
        resource_type=saved.resource_type,
        resource_id=saved.resource_id,
        status=saved.status,
        priority=saved.priority,
        metadata=saved.metadata,
        assignee_id=assignee,
        due_date=due,
        created_at=saved.created_at,
        updated_at=saved.updated_at,
    )

