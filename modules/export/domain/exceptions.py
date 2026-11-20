from core.exceptions.base import (
    BusinessRuleViolationError,
    EntityNotFoundError,
    InvariantViolationError,
)


class SnapshotNotFoundError(EntityNotFoundError):
    def __init__(
        self,
        message: str = "Snapshot not found",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class IncompatibleFormatError(BusinessRuleViolationError):
    def __init__(
        self,
        message: str = "Requested export format is incompatible with ontology outputs",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class SnapshotNotReadyError(BusinessRuleViolationError):
    def __init__(
        self,
        message: str = "Snapshot is not ready for export",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class ScaleLimitExceededError(BusinessRuleViolationError):
    def __init__(
        self,
        message: str = "Export size exceeds full bundle scale limits (max 2 GB or 5,000 files)",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class ExportPackageNotFoundError(EntityNotFoundError):
    def __init__(
        self,
        message: str = "Export package not found",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)


class ExportPackageImmutableError(InvariantViolationError):
    def __init__(
        self,
        message: str = "Export package is immutable and cannot be updated",
        details: dict | None = None,
    ) -> None:
        super().__init__(message=message, details=details)
