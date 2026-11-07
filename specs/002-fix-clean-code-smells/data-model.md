# Data Model & Exception Hierarchy: Remediation of Code Smells

## 1. Pure Domain Exception Hierarchy (`core/exceptions/base.py`)

All domain exceptions are pure Python classes completely decoupled from HTTP protocols:

```python
class DomainException(Exception):
    """Base exception for all enterprise business errors."""
    def __init__(self, message: str, details: dict | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or {}

class InvariantViolationError(DomainException):
    """Raised when an internal aggregate invariant or contract is broken."""
    pass

class BusinessRuleViolationError(DomainException):
    """Raised when a business policy or domain workflow rule is violated."""
    pass

class EntityNotFoundError(DomainException):
    """Raised when a requested domain entity does not exist."""
    pass

class ConflictError(DomainException):
    """Raised when a unique constraint or concurrency conflict occurs."""
    pass

class UnauthorizedError(DomainException):
    """Raised when an action lacks valid identity authentication."""
    pass

class ForbiddenError(DomainException):
    """Raised when an authenticated actor lacks permission for a domain action."""
    pass

class OntologySeedingError(DomainException):
    """Raised when template ontology auto-seeding encounters an irrecoverable error."""
    pass
```

---

## 2. Global System Constants (`core/constants.py`)

```python
# Canonical integer identifier for automated system actions, seeders, and background workers
SYSTEM_USER_ID: int = 0
```

---

## 3. Clean Domain Dataclass Definitions (`modules/project/domain/entities.py`)

*Clean Python `@dataclass` structure with contiguous field declarations and unified `user_id: int`.*

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from core.constants import SYSTEM_USER_ID
from core.utils.id_generator import generate_ulid

@dataclass
class ProjectMemberEntity:
    project_id: str
    user_id: int
    role: str
    id: str = field(default_factory=generate_ulid)
    status: str = "active"
    joined_at: datetime | None = None

    def __post_init__(self) -> None:
        if isinstance(self.user_id, str):
            self.user_id = int(self.user_id) if self.user_id.isdigit() else SYSTEM_USER_ID

@dataclass
class ProjectEntity:
    name: str
    created_by: int
    template_id: str | None = None
    description: str | None = None
    status: str = "active"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    archived_at: datetime | None = None

    def __post_init__(self) -> None:
        if isinstance(self.created_by, str):
            self.created_by = int(self.created_by) if self.created_by.isdigit() else SYSTEM_USER_ID

    @property
    def owner_id(self) -> int:
        return self.created_by
```

---

## 4. Model $\leftrightarrow$ Entity Conversion Standard

In all SQLAlchemy models (`ProjectModel`, `ProjectMemberModel`, `AnnotationModel`, `AnnotationRevisionModel`):

```python
# from_entity: safely convert entity.created_by (int) to database column String(255)
created_by = str(entity.created_by)

# to_entity: safely convert column String(255) to entity created_by (int)
created_by = int(self.created_by) if str(self.created_by).isdigit() else SYSTEM_USER_ID
```
