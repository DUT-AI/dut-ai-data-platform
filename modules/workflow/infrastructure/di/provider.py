from dishka import Provider, Scope, provide
from sqlalchemy.ext.asyncio import AsyncSession

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
from modules.workflow.domain.interfaces.repositories import (
    IAssignmentRepository,
    IWorkflowDefinitionRepository,
    IWorkflowHistoryRepository,
    IWorkItemRepository,
)
from modules.workflow.infrastructure.repositories.assignment_repository import (
    AssignmentRepository,
)
from modules.workflow.infrastructure.repositories.history_repository import (
    WorkflowHistoryRepository,
)
from modules.workflow.infrastructure.repositories.work_item_repository import (
    WorkItemRepository,
)
from modules.workflow.infrastructure.repositories.workflow_definition_repository import (
    WorkflowDefinitionRepository,
)


class WorkflowProvider(Provider):
    scope = Scope.REQUEST

    @provide
    def get_workflow_definition_repo(self, session: AsyncSession) -> IWorkflowDefinitionRepository:
        return WorkflowDefinitionRepository(session)

    @provide
    def get_work_item_repo(self, session: AsyncSession) -> IWorkItemRepository:
        return WorkItemRepository(session)

    @provide
    def get_assignment_repo(self, session: AsyncSession) -> IAssignmentRepository:
        return AssignmentRepository(session)

    @provide
    def get_history_repo(self, session: AsyncSession) -> IWorkflowHistoryRepository:
        return WorkflowHistoryRepository(session)

    @provide
    def get_create_workflow_use_case(
        self, repo: IWorkflowDefinitionRepository
    ) -> CreateWorkflowDefinitionUseCase:
        return CreateWorkflowDefinitionUseCase(repo)

    @provide
    def get_create_batch_use_case(
        self,
        work_item_repo: IWorkItemRepository,
        workflow_repo: IWorkflowDefinitionRepository,
    ) -> CreateBatchWorkItemsUseCase:
        return CreateBatchWorkItemsUseCase(work_item_repo, workflow_repo)

    @provide
    def get_bulk_assign_use_case(
        self,
        work_item_repo: IWorkItemRepository,
        assignment_repo: IAssignmentRepository,
        history_repo: IWorkflowHistoryRepository,
    ) -> BulkAssignWorkItemsUseCase:
        return BulkAssignWorkItemsUseCase(work_item_repo, assignment_repo, history_repo)

    @provide
    def get_transition_use_case(
        self,
        work_item_repo: IWorkItemRepository,
        history_repo: IWorkflowHistoryRepository,
        assignment_repo: IAssignmentRepository,
    ) -> TransitionWorkItemUseCase:
        return TransitionWorkItemUseCase(work_item_repo, history_repo, assignment_repo)

    @provide
    def get_history_use_case(
        self,
        work_item_repo: IWorkItemRepository,
        history_repo: IWorkflowHistoryRepository,
    ) -> GetWorkItemHistoryUseCase:
        return GetWorkItemHistoryUseCase(work_item_repo, history_repo)
