from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from core.utils.id_generator import generate_ulid


@dataclass
class ProjectTemplateEntity:
    id: str
    name: str
    category: str = "General"
    modality: str = "image"
    description: str | None = None
    image: str | None = None
    tools: list[dict[str, Any]] = field(default_factory=list)
    labels: list[dict[str, Any]] = field(default_factory=list)
    default_project_configuration: dict[str, Any] = field(default_factory=dict)
    status: str = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None

