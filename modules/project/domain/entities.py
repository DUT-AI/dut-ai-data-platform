from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from core.utils.id_generator import generate_ulid


@dataclass
class ProjectConfigurationEntity:
    project_id: str
    id: str = field(default_factory=generate_ulid)
    annotation_provider_key: str = "label_studio"
    storage_provider_key: str = "minio"
    default_workflow_ref: str | None = None
    settings: dict[str, Any] = field(default_factory=dict)
    settings_schema_version: str = "1.0"
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class ProjectMemberEntity:
    project_id: str
    user_id: str
    role: str
    id: str = field(default_factory=generate_ulid)
    status: str = "active"
    joined_at: datetime | None = None


@dataclass
class ProjectEntity:
    name: str
    created_by: str
    task_definition_version_id: str | None = None
    description: str | None = None
    project_template_version_id: str | None = None
    status: str = "active"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None
    archived_at: datetime | None = None

    @property
    def owner_id(self) -> str:
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
