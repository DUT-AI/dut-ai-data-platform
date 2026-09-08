from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from core.utils.id_generator import generate_ulid

JsonObject = dict[str, Any]


@dataclass
class InputDefinitionEntity:
    code: str
    name: str
    allowed_formats: list[str]
    id: str = field(default_factory=generate_ulid)
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class OutputDefinitionEntity:
    code: str
    name: str
    supports_categories: bool
    default_schema: JsonObject
    id: str = field(default_factory=generate_ulid)
    description: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class OntologyInputEntity:
    ontology_id: str
    definition_id: str
    name: str
    scope: str
    input_schema: JsonObject
    id: str = field(default_factory=generate_ulid)
    description: str | None = None
    definition: InputDefinitionEntity | None = None
    locked: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class OntologyOutputEntity:
    ontology_id: str
    definition_id: str
    name: str
    multiple: bool
    required: bool
    id: str = field(default_factory=generate_ulid)
    description: str | None = None
    value_schema: JsonObject | None = None
    definition: OutputDefinitionEntity | None = None
    locked: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class CategoryEntity:
    ontology_id: str
    key: str
    name: str
    id: str = field(default_factory=generate_ulid)
    color: str | None = None
    description: str | None = None
    locked: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def display_name(self) -> str:
        return self.name


@dataclass
class OntologyVersionInputEntity:
    ontology_version_id: str
    ontology_input_id: str
    sort_order: int = 0
    input: OntologyInputEntity | None = None


@dataclass
class OntologyVersionOutputCategoryEntity:
    ontology_version_id: str
    ontology_output_id: str
    category_id: str
    sort_order: int = 0
    category: CategoryEntity | None = None


@dataclass
class OntologyVersionOutputEntity:
    ontology_version_id: str
    ontology_output_id: str
    ontology_input_id: str
    sort_order: int = 0
    output: OntologyOutputEntity | None = None
    input: OntologyInputEntity | None = None
    categories: list[OntologyVersionOutputCategoryEntity] = field(default_factory=list)


@dataclass
class OntologyVersionEntity:
    ontology_id: str
    version_no: int
    name: str
    id: str = field(default_factory=generate_ulid)
    status: str = "draft"
    based_on_version_id: str | None = None
    schema_hash: str | None = None
    raw_label_config: str | None = None
    published_at: datetime | None = None
    inputs: list[OntologyVersionInputEntity] = field(default_factory=list)
    outputs: list[OntologyVersionOutputEntity] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    @property
    def is_editable(self) -> bool:
        return self.status == "draft"

    @property
    def version(self) -> str:
        return str(self.version_no)

    @property
    def categories(self) -> list[CategoryEntity]:
        seen: set[str] = set()
        result: list[CategoryEntity] = []
        for output_link in self.outputs:
            for category_link in output_link.categories:
                category = category_link.category
                if category is not None and category.id not in seen:
                    seen.add(category.id)
                    result.append(category)
        return result


@dataclass
class OntologyEntity:
    project_id: str
    name: str
    id: str = field(default_factory=generate_ulid)
    description: str | None = None
    current_version_id: str | None = None
    versions: list[OntologyVersionEntity] = field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True)
class ValidationIssue:
    path: str
    code: str
    message: str
