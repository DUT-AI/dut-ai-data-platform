from dataclasses import dataclass, field
from datetime import datetime

from core.utils.id_generator import generate_ulid


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
    project_type: str
    owner_id: str
    description: str | None = None
    status: str = "active"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    def archive(self) -> None:
        self.status = "archived"
