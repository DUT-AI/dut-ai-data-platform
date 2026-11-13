import pytest
from modules.workflow.domain.entities.workflow import WorkItemStatus
from modules.workflow.domain.services.transition_engine import TransitionEngine
from modules.workflow.domain.exceptions.workflow_exceptions import InvalidStateTransitionError


def test_valid_standard_lifecycle():
    """Verify standard happy-path progression."""
    TransitionEngine.validate_transition(WorkItemStatus.CREATED, WorkItemStatus.ASSIGNED)
    TransitionEngine.validate_transition(WorkItemStatus.ASSIGNED, WorkItemStatus.IN_PROGRESS)
    TransitionEngine.validate_transition(WorkItemStatus.IN_PROGRESS, WorkItemStatus.SUBMITTED)
    TransitionEngine.validate_transition(WorkItemStatus.SUBMITTED, WorkItemStatus.IN_REVIEW)
    TransitionEngine.validate_transition(WorkItemStatus.IN_REVIEW, WorkItemStatus.APPROVED)
    TransitionEngine.validate_transition(WorkItemStatus.APPROVED, WorkItemStatus.COMPLETED)


def test_rejection_flow():
    """Verify rejection transitions: can resubmit, resume in-progress, or reassign."""
    TransitionEngine.validate_transition(WorkItemStatus.IN_REVIEW, WorkItemStatus.REJECTED)
    TransitionEngine.validate_transition(WorkItemStatus.REJECTED, WorkItemStatus.SUBMITTED)
    TransitionEngine.validate_transition(WorkItemStatus.REJECTED, WorkItemStatus.IN_PROGRESS)
    TransitionEngine.validate_transition(WorkItemStatus.REJECTED, WorkItemStatus.ASSIGNED)


def test_cancellation_allowed_from_active_states():
    """Verify cancellation allowed on active/non-terminal states."""
    active_states = [
        WorkItemStatus.CREATED,
        WorkItemStatus.ASSIGNED,
        WorkItemStatus.IN_PROGRESS,
        WorkItemStatus.SUBMITTED,
        WorkItemStatus.IN_REVIEW,
        WorkItemStatus.REJECTED,
    ]
    for state in active_states:
        TransitionEngine.validate_transition(state, WorkItemStatus.CANCELLED)


def test_cancellation_prohibited_from_approved_and_completed():
    """SC-001 & FR-009: Strict boundary prohibiting cancellation from Approved or Completed."""
    with pytest.raises(InvalidStateTransitionError) as exc_approved:
        TransitionEngine.validate_transition(WorkItemStatus.APPROVED, WorkItemStatus.CANCELLED)
    assert "Cannot cancel WorkItem in 'APPROVED' state" in str(exc_approved.value)

    with pytest.raises(InvalidStateTransitionError) as exc_completed:
        TransitionEngine.validate_transition(WorkItemStatus.COMPLETED, WorkItemStatus.CANCELLED)
    assert "Cannot cancel WorkItem in 'COMPLETED' state" in str(exc_completed.value)


def test_illegal_state_jumps_rejected():
    """Verify illegal transitions are rejected."""
    # Cannot jump directly from Created to Approved
    with pytest.raises(InvalidStateTransitionError):
        TransitionEngine.validate_transition(WorkItemStatus.CREATED, WorkItemStatus.APPROVED)

    # Cannot jump from InProgress to Completed
    with pytest.raises(InvalidStateTransitionError):
        TransitionEngine.validate_transition(WorkItemStatus.IN_PROGRESS, WorkItemStatus.COMPLETED)

    # Cannot transition from Completed (terminal)
    with pytest.raises(InvalidStateTransitionError):
        TransitionEngine.validate_transition(WorkItemStatus.COMPLETED, WorkItemStatus.IN_PROGRESS)

    # Cannot transition from Cancelled (terminal)
    with pytest.raises(InvalidStateTransitionError):
        TransitionEngine.validate_transition(WorkItemStatus.CANCELLED, WorkItemStatus.ASSIGNED)

