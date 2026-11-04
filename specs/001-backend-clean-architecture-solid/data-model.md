# Data Model Specification: Backend Clean Architecture & SOLID Refactoring

## 1. Domain Entities & Aggregate Roots

### 1.1 Identity Domain (`modules/identity/domain/entities.py`)
*Pure Python dataclasses - zero imports from Pydantic, FastAPI, or SQLAlchemy.*

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass
class UserEntity:
    """Core domain user entity representing identity in the Data Platform."""
    id: int
    email: str
    name: str | None = None
    role: str = "user"
    avatar_url: str | None = None
    status: str = "ACTIVE"
    created_at: datetime | None = None

@dataclass
class UserLoginMetadataEntity:
    """Domain record of a user's recent login activity."""
    user_id: int
    last_login_at: datetime
    created_at: datetime | None = None
    updated_at: datetime | None = None
```

---

### 1.2 Annotation Domain (`modules/annotation/domain/entities.py`)
*Rich Aggregate Root managing revisions and enforcing sequence invariants.*

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal
from core.utils.id_generator import generate_ulid

SelectorType = Literal[
    "FULL_ASSET", "RECORD", "TEXT_SPAN", "TIME_RANGE", "FRAME_RANGE", "DOCUMENT_PAGE"
]
RevisionSource = Literal["human", "machine"]

@dataclass
class AnnotationRevisionEntity:
    annotation_id: str
    revision_number: int
    created_by: int
    ontology_version_id: str
    id: str = field(default_factory=generate_ulid)
    source: RevisionSource = "human"
    results: list[dict[str, Any]] = field(default_factory=list)
    category_ids: list[str] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

@dataclass
class AnnotationEntity:
    """Aggregate Root for Asset Annotation.
    
    Protects invariants:
    - Maintains sequential revision numbers.
    - Encapsulates target selector.
    """
    asset_id: str
    project_id: str
    created_by: int
    target_type: SelectorType = "FULL_ASSET"
    target_selector: dict[str, Any] = field(default_factory=dict)
    ontology_version_id: str | None = None
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    revisions: list[AnnotationRevisionEntity] = field(default_factory=list)

    @property
    def latest_revision(self) -> AnnotationRevisionEntity | None:
        return self.revisions[-1] if self.revisions else None

    def add_revision(
        self,
        source: RevisionSource,
        results: list[dict[str, Any]],
        category_ids: list[str],
        created_by: int,
        ontology_version_id: str | None = None,
    ) -> AnnotationRevisionEntity:
        """Domain Method: Appends a new revision with guaranteed next revision_number."""
        next_revision_number = (
            max((r.revision_number for r in self.revisions), default=0) + 1
        )
        revision = AnnotationRevisionEntity(
            annotation_id=self.id,
            revision_number=next_revision_number,
            ontology_version_id=ontology_version_id or self.ontology_version_id or "",
            created_by=created_by,
            source=source,
            results=results,
            category_ids=category_ids,
        )
        self.revisions.append(revision)
        return revision
```

---

### 1.3 Project Domain (`modules/project/domain/entities.py`)
*Project Aggregate with standardized `user_id: int`.*

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from core.utils.id_generator import generate_ulid

@dataclass
class ProjectMemberEntity:
    project_id: str
    user_id: int
    role: str
    id: str = field(default_factory=generate_ulid)
    status: str = "active"
    joined_at: datetime | None = None

@dataclass
class ProjectConfigurationEntity:
    project_id: str
    id: str = field(default_factory=generate_ulid)
    storage_provider_key: str = "minio"
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = field(default_factory=dict)
    settings_schema_version: str = "1.0"
    created_at: datetime | None = None
    updated_at: datetime | None = None

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

    @property
    def owner_id(self) -> int:
        return self.created_by
```

---

### 1.4 Dataset Domain (`modules/dataset/domain/entities.py`)
*Dataset Aggregate with standardized `created_by: int | None`.*

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from core.utils.id_generator import generate_ulid

@dataclass
class AssetEntity:
    project_id: str
    dataset_version_id: str
    storage_uri: str
    file_name: str
    file_size_bytes: int
    mime_type: str
    sha256_hash: str
    id: str = field(default_factory=generate_ulid)
    metadata: dict[str, Any] = field(default_factory=dict)
    created_by: int | None = None
    created_at: datetime | None = None

@dataclass
class DatasetVersionEntity:
    dataset_id: str
    version: str
    version_number: int
    status: str = "draft"
    id: str = field(default_factory=generate_ulid)
    version_label: str | None = None
    manifest_hash: str | None = None
    asset_count: int = 0
    published_at: datetime | None = None
    assets: list[AssetEntity] = field(default_factory=list)

@dataclass
class DatasetEntity:
    project_id: str
    name: str
    description: str | None = None
    tags: list[str] = field(default_factory=list)
    id: str = field(default_factory=generate_ulid)
    created_by: int | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    versions: list[DatasetVersionEntity] = field(default_factory=list)
```

---

## 2. Summary of Identity Types

| Field | Entity / Context | Type | Description |
| :--- | :--- | :--- | :--- |
| `user_id` / `id` | `UserEntity`, `AuthUser` | `int` | Primary integer key from external Auth/Manage Server |
| `created_by` | `ProjectEntity`, `AnnotationEntity`, `AnnotationRevisionEntity`, `DatasetEntity` | `int` | Foreign reference to User ID |
| `owner_id` | `ProjectEntity.owner_id` | `int` | Legacy alias property returning `created_by: int` |
| `user_id` | `ProjectMemberEntity.user_id` | `int` | Member reference to User ID |
| `id` (resource) | `Project`, `Dataset`, `Asset`, `Annotation`, `Ontology` | `str` | Platform-generated ULID (26 chars) |
