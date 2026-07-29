from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class OntologyCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None


class OntologyResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    name: str
    description: str | None = None
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    versions: list["OntologyVersionResponseDTO"] = Field(default_factory=list)


class OntologyVersionCreateDTO(BaseModel):
    version: str = Field(..., min_length=1, max_length=50)


class CategoryCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    display_name: str | None = None
    description: str | None = None
    color: str = "#3B82F6"
    parent_category_id: str | None = None
    sort_order: int = 0


class CategoryUpdateDTO(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    display_name: str | None = None
    description: str | None = None
    color: str | None = None
    parent_category_id: str | None = None
    sort_order: int | None = None


class AttributeCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    display_name: str | None = None
    type: Literal["string", "number", "boolean", "enum", "list"]
    required: bool = False
    default_value: str | None = None
    allowed_values: Any | None = None
    description: str | None = None


class AttributeUpdateDTO(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    display_name: str | None = None
    type: Literal["string", "number", "boolean", "enum", "list"] | None = None
    required: bool | None = None
    default_value: str | None = None
    allowed_values: Any | None = None
    description: str | None = None


class AttributeResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category_id: str
    name: str
    display_name: str | None = None
    type: str
    required: bool
    default_value: str | None = None
    allowed_values: Any | None = None
    description: str | None = None


class CategoryResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ontology_version_id: str
    name: str
    display_name: str | None = None
    description: str | None = None
    color: str
    parent_category_id: str | None = None
    sort_order: int
    attributes: list[AttributeResponseDTO] = Field(default_factory=list)


class OntologyVersionResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ontology_id: str
    version: str
    status: str
    created_at: datetime | None = None
    published_at: datetime | None = None
    raw_label_config: str | None = None
    categories: list[CategoryResponseDTO] = Field(default_factory=list)


class OntologyVersionUpdateDTO(BaseModel):
    raw_label_config: str | None = None
