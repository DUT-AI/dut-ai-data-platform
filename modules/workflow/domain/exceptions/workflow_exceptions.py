class WorkflowDomainException(Exception):
    """Base exception for workflow domain."""


class InvalidStateTransitionError(WorkflowDomainException):
    def __init__(self, from_state: str, to_state: str, message: str = ""):
        self.from_state = from_state
        self.to_state = to_state
        self.message = message or f"Illegal state transition from '{from_state}' to '{to_state}'."
        super().__init__(self.message)


class WorkItemNotFoundError(WorkflowDomainException):
    def __init__(self, work_item_id: str):
        self.work_item_id = work_item_id
        super().__init__(f"Work item with ID '{work_item_id}' not found.")


class WorkflowDefinitionNotFoundError(WorkflowDomainException):
    def __init__(self, workflow_id: str):
        self.workflow_id = workflow_id
        super().__init__(f"Workflow definition with ID '{workflow_id}' not found.")


class InvalidAssignmentError(WorkflowDomainException):
    def __init__(self, message: str):
        super().__init__(message)

