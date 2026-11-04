from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from core.utils.id_generator import generate_ulid


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
class ProjectMemberEntity:
    project_id: str
    user_id: int

    def __post_init__(self):
        if isinstance(self.user_id, str) and self.user_id.isdigit():
            self.user_id = int(self.user_id)
    role: str
    id: str = field(default_factory=generate_ulid)
    status: str = "active"
    joined_at: datetime | None = None


@dataclass
class ProjectEntity:
    name: str
    created_by: int

    def __post_init__(self):
        if isinstance(self.created_by, str) and self.created_by.isdigit():
            self.created_by = int(self.created_by)
    template_id: str | None = None
    description: str | None = None
    status: str = "active"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    archived_at: datetime | None = None

    @property
    def project_template_version_id(self) -> str | None:
        return self.template_id

    @property
    def task_definition_version_id(self) -> str | None:
        return self.template_id


    @property
    def owner_id(self) -> int:
        """Legacy response alias; ownership is managed by Project Member."""
        return self.created_by

    @property
    def project_type(self) -> str:
        """Legacy display alias retained during Task Catalog migration."""
        return "catalog"

    def archive(self, at: datetime) -> bool:
        if self.status == "archived":
            return False
        self.status = "archived"
        self.archived_at = at
        return True

    def restore(self) -> bool:
        if self.status == "active":
            return False
        self.status = "active"
        self.archived_at = None
        return True
