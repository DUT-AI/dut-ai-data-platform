from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from shared.utils.id_generator import generate_ulid


@dataclass
class AttributeEntity:
    category_id: str
    name: str
    type: str  # string, number, boolean, enum, list
    id: str = field(default_factory=generate_ulid)
    display_name: str | None = None
    required: bool = False
    default_value: str | None = None
    allowed_values: Any | None = None
    description: str | None = None


@dataclass
class CategoryEntity:
    ontology_version_id: str
    name: str
    id: str = field(default_factory=generate_ulid)
    display_name: str | None = None
    description: str | None = None
    color: str = "#3B82F6"
    parent_category_id: str | None = None
    sort_order: int = 0
    attributes: list[AttributeEntity] = field(default_factory=list)


@dataclass
class OntologyVersionEntity:
    ontology_id: str
    version: str
    id: str = field(default_factory=generate_ulid)
    status: str = "draft"  # draft, published, archived
    created_at: datetime | None = None
    published_at: datetime | None = None
    categories: list[CategoryEntity] = field(default_factory=list)

    @property
    def is_editable(self) -> bool:
        return self.status == "draft"


@dataclass
class OntologyEntity:
    project_id: str
    name: str
    id: str = field(default_factory=generate_ulid)
    description: str | None = None
    status: str = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None
    versions: list[OntologyVersionEntity] = field(default_factory=list)
