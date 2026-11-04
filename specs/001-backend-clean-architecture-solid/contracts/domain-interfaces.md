# Domain Interface Contracts (Dependency Inversion)

All interfaces are pure Python `typing.Protocol` classes defined in `modules/*/domain/interfaces.py`.

## 1. Storage Interface Contract (`core/storage/interface.py`)

```python
from typing import Protocol, BinaryIO

class IStorageProvider(Protocol):
    async def upload(
        self, bucket: str, key: str, data: BinaryIO, content_type: str | None = None
    ) -> str:
        """Uploads binary stream to storage provider asynchronously and returns storage URI."""
        ...

    async def generate_presigned_download_url(
        self, bucket: str, key: str, expires_in: int = 3600
    ) -> str: ...

    async def generate_presigned_upload_url(
        self, bucket: str, key: str, expires_in: int = 3600
    ) -> str: ...
```

---

## 2. External Authentication Client Contract (`modules/identity/domain/interfaces.py`)

```python
from typing import Protocol
from modules.identity.dtos.auth_dtos import AuthUserDTO, TokenResponseDTO

class IAuthClient(Protocol):
    async def login(self, email: str, password: str) -> TokenResponseDTO: ...
    async def get_me(self, token: str) -> AuthUserDTO: ...
    async def list_users(self, token: str, page: int = 1, page_size: int = 100) -> list[AuthUserDTO]: ...
```

---

## 3. Annotation Repository Contract (`modules/annotation/domain/interfaces.py`)

```python
from typing import Protocol, Sequence
from modules.annotation.domain.entities import AnnotationEntity, AnnotationRevisionEntity

class IAnnotationRepository(Protocol):
    async def save_annotation(self, annotation: AnnotationEntity) -> AnnotationEntity: ...
    async def get_annotation_by_id(self, annotation_id: str) -> AnnotationEntity | None: ...
    async def get_annotation_by_target(
        self, asset_id: str, target_type: str, target_selector: dict
    ) -> AnnotationEntity | None: ...
    async def create_revision(self, revision: AnnotationRevisionEntity) -> AnnotationRevisionEntity: ...
    async def list_revisions_by_annotation(self, annotation_id: str) -> Sequence[AnnotationRevisionEntity]: ...
    async def list_by_asset(
        self, asset_id: str, target_type: str | None = None
    ) -> Sequence[AnnotationEntity]: ...
```

---

## 4. Ontology Template Seeder Service Contract (`modules/ontology/domain/interfaces.py`)

```python
from typing import Protocol
from modules.ontology.domain.entities import OntologyEntity, OntologyVersionEntity

class IOntologyTemplateSeederService(Protocol):
    async def seed_from_project_template(
        self, project_id: str, ontology: OntologyEntity, draft_version: OntologyVersionEntity
    ) -> None:
        """Encapsulates all template querying, input/output definition mappings, and category creation."""
        ...
```
