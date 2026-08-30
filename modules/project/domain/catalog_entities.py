from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from core.utils.id_generator import generate_ulid


@dataclass
class TaskDefinitionEntity:
    key: str
    name: str
    category: str
    modality: str
    description: str | None = None
    status: str = "active"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class TaskDefinitionVersionEntity:
    task_definition_id: str
    version: str
    input_schema: dict[str, Any]
    capability_schema: dict[str, Any]
    constraints: dict[str, Any] = field(default_factory=dict)
    status: str = "draft"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    published_at: datetime | None = None


@dataclass
class ProjectTemplateEntity:
    key: str
    name: str
    task_definition_id: str
    description: str | None = None
    status: str = "active"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class ProjectTemplateVersionEntity:
    project_template_id: str
    version: str
    default_project_configuration: dict[str, Any] = field(default_factory=dict)
    ontology_template_ref: str | None = None
    status: str = "draft"
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
    published_at: datetime | None = None


@dataclass
class TemplateProviderCompatibilityEntity:
    project_template_version_id: str
    provider_key: str
    status: str = "active"
    constraints: dict[str, Any] = field(default_factory=dict)
    id: str = field(default_factory=generate_ulid)
    created_at: datetime | None = None
