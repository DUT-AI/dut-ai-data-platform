from typing import ClassVar

from modules.workflow.domain.entities.workflow import WorkItemStatus
from modules.workflow.domain.exceptions.workflow_exceptions import (
    InvalidStateTransitionError,
)


class TransitionEngine:
    """Pure domain service enforcing valid lifecycle transitions."""

    # Explicit allowed state transitions (including valid reverse/rollback steps for operational mistakes)
    ALLOWED_TRANSITIONS: ClassVar[dict[WorkItemStatus, set[WorkItemStatus]]] = {
        WorkItemStatus.CREATED: {WorkItemStatus.ASSIGNED, WorkItemStatus.CANCELLED},
        WorkItemStatus.ASSIGNED: {WorkItemStatus.IN_PROGRESS, WorkItemStatus.CREATED, WorkItemStatus.CANCELLED},
        WorkItemStatus.IN_PROGRESS: {WorkItemStatus.SUBMITTED, WorkItemStatus.ASSIGNED, WorkItemStatus.CANCELLED},
        WorkItemStatus.SUBMITTED: {WorkItemStatus.IN_REVIEW, WorkItemStatus.IN_PROGRESS, WorkItemStatus.CANCELLED},
        WorkItemStatus.IN_REVIEW: {WorkItemStatus.APPROVED, WorkItemStatus.REJECTED, WorkItemStatus.SUBMITTED, WorkItemStatus.CANCELLED},
        WorkItemStatus.REJECTED: {WorkItemStatus.SUBMITTED, WorkItemStatus.IN_PROGRESS, WorkItemStatus.ASSIGNED, WorkItemStatus.CANCELLED},
        WorkItemStatus.APPROVED: {WorkItemStatus.COMPLETED, WorkItemStatus.IN_REVIEW},
        WorkItemStatus.CANCELLED: {WorkItemStatus.CREATED},
        # Terminal finalized state
        WorkItemStatus.COMPLETED: set(),
    }

    @classmethod
    def validate_transition(
        cls,
        current_status: WorkItemStatus,
        target_status: WorkItemStatus,
    ) -> None:
        """Validates if current -> target is allowed.
        Raises InvalidStateTransitionError if prohibited.
        """
        # Identity check: transitioning to the same state is a no-op / prohibited
        if current_status == target_status:
            raise InvalidStateTransitionError(
                from_state=current_status.value,
                to_state=target_status.value,
                message=f"WorkItem is already in '{current_status.value}' state.",
            )

        allowed = cls.ALLOWED_TRANSITIONS.get(current_status, set())
        if target_status not in allowed:
            # Special explanation if attempting to cancel from Approved or Completed
            if target_status == WorkItemStatus.CANCELLED and current_status in {
                WorkItemStatus.APPROVED,
                WorkItemStatus.COMPLETED,
            }:
                raise InvalidStateTransitionError(
                    from_state=current_status.value,
                    to_state=target_status.value,
                    message=(
                        f"Cannot cancel WorkItem in '{current_status.value}' state. "
                        "Cancellation is prohibited once approved or completed to preserve data integrity."
                    ),
                )

            raise InvalidStateTransitionError(
                from_state=current_status.value,
                to_state=target_status.value,
                message=f"Illegal transition from '{current_status.value}' to '{target_status.value}'.",
            )

