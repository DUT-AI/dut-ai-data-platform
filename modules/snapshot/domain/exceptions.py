from core.exceptions.base import (
    BusinessRuleViolationError,
    ConflictError,
    EntityNotFoundError,
    InvariantViolationError,
)


class SnapshotImmutableError(InvariantViolationError):
    def __init__(
        self,
        message: str = "Snapshot is immutable and cannot be modified",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class OntologyIncompatibilityError(BusinessRuleViolationError):
    def __init__(
        self,
        message: str = "Annotations do not conform to ontology version",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class SnapshotNotFoundError(EntityNotFoundError):
    def __init__(
        self, message: str = "Snapshot not found", details: dict | None = None
    ) -> None:
        super().__init__(message=message, details=details)


class InvalidSplitRatioError(BusinessRuleViolationError):
    def __init__(
        self,
        message: str = "Invalid split ratios configuration",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class ActiveDependencyConflictError(ConflictError):
    def __init__(
        self,
        message: str = "Snapshot is actively referenced by downstream jobs",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class SnapshotVersionConflictError(ConflictError):
    def __init__(
        self,
        message: str = "Snapshot version name already exists in project",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class ReferentialGuardError(BusinessRuleViolationError):
    def __init__(
        self,
        message: str = "Cannot delete or purge asset/revision referenced by an active snapshot",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)
