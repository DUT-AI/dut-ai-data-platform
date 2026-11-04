"""Domain exception hierarchy. Pure Python, decoupled from HTTP/transport."""


class DomainException(Exception):
    """Base exception for all enterprise business errors."""

    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}


class InvariantViolationError(DomainException):
    """Raised when an internal aggregate invariant or contract is broken."""

    def __init__(
        self,
        message: str = "Domain invariant violation",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class BusinessRuleViolationError(DomainException):
    """Raised when a business policy or domain workflow rule is violated."""

    def __init__(
        self,
        message: str = "Business rule violation",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class EntityNotFoundError(DomainException):
    """Raised when a requested domain entity does not exist."""

    def __init__(
        self,
        message: str = "Entity not found",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class ConflictError(DomainException):
    """Raised when a unique constraint or concurrency conflict occurs."""

    def __init__(
        self,
        message: str = "Resource conflict",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class UnauthorizedError(DomainException):
    """Raised when an action lacks valid identity authentication."""

    def __init__(
        self,
        message: str = "Unauthorized",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class ForbiddenError(DomainException):
    """Raised when an authenticated actor lacks permission for a domain action."""

    def __init__(
        self,
        message: str = "Forbidden",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class OntologySeedingError(DomainException):
    """Raised when template ontology auto-seeding encounters an irrecoverable error."""

    def __init__(
        self,
        message: str = "Ontology seeding failed",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class StorageError(DomainException):
    """Base infrastructure storage failure."""

    def __init__(
        self,
        message: str = "Storage operation failed",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


class StorageUploadError(StorageError):
    """Storage upload failure."""

    def __init__(
        self,
        message: str = "Failed to upload file to storage",
        details: dict | None = None,
    ) -> None:
        super().__init__(message, details)


# Backward-compatibility aliases for legacy code
DomainError = DomainException
NotFoundException = EntityNotFoundError
BadRequestException = BusinessRuleViolationError
ConflictException = ConflictError
UnauthorizedException = UnauthorizedError
ForbiddenException = ForbiddenError
