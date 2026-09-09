from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

KEY_PATTERN = r"^[a-z][a-z0-9_]*$"
COLOR_PATTERN = r"^#[0-9A-Fa-f]{6}$"
InputScope = Literal["ONE_ITEM", "MANY_ITEMS"]


class StrictDTO(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class OntologyCreateDTO(StrictDTO):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class OntologyUpdateDTO(StrictDTO):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)


class InputDefinitionCreateDTO(StrictDTO):
    code: str = Field(pattern=KEY_PATTERN, max_length=60)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    allowed_formats: list[str] = Field(min_length=1, max_length=50)

    @field_validator("allowed_formats")
    @classmethod
    def normalize_formats(cls, values: list[str]) -> list[str]:
        normalized = [value.strip().lower().removeprefix(".") for value in values]
        if any(not value or len(value) > 20 for value in normalized):
            raise ValueError("Mỗi định dạng phải dài từ 1 đến 20 ký tự.")
        if len(normalized) != len(set(normalized)):
            raise ValueError("Danh sách định dạng không được trùng.")
        return normalized


class InputDefinitionUpdateDTO(StrictDTO):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    allowed_formats: list[str] | None = Field(default=None, min_length=1, max_length=50)

    @field_validator("allowed_formats")
    @classmethod
    def normalize_formats(cls, values: list[str] | None) -> list[str] | None:
        if values is None:
            return None
        return InputDefinitionCreateDTO.normalize_formats(values)


class OutputDefinitionCreateDTO(StrictDTO):
    code: str = Field(pattern=KEY_PATTERN, max_length=60)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    supports_categories: bool = False
    default_schema: dict[str, Any]


class OutputDefinitionUpdateDTO(StrictDTO):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    supports_categories: bool | None = None
    default_schema: dict[str, Any] | None = None


class InputSchemaDTO(StrictDTO):
    type: Literal["image", "audio", "video", "document", "tabular", "object", "link"]
    allowed_extensions: list[str] = Field(min_length=1, max_length=50)
    item: dict[str, Any] | None = None

    @field_validator("allowed_extensions")
    @classmethod
    def normalize_extensions(cls, values: list[str]) -> list[str]:
        normalized = [value.strip().lower().removeprefix(".") for value in values]
        if any(not value or len(value) > 20 for value in normalized):
            raise ValueError("Mỗi đuôi file phải dài từ 1 đến 20 ký tự.")
        if len(normalized) != len(set(normalized)):
            raise ValueError("Đuôi file không được trùng.")
        return normalized


class OntologyInputCreateDTO(StrictDTO):
    definition_id: str = Field(min_length=1, max_length=26)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    scope: InputScope
    input_schema: InputSchemaDTO

    @model_validator(mode="after")
    def validate_item(self) -> "OntologyInputCreateDTO":
        if self.scope == "ONE_ITEM" and self.input_schema.item is not None:
            raise ValueError("ONE_ITEM yêu cầu input_schema.item = null.")
        if self.scope == "MANY_ITEMS" and not self.input_schema.item:
            raise ValueError("MANY_ITEMS yêu cầu input_schema.item là một object.")
        return self


class OntologyInputUpdateDTO(StrictDTO):
    definition_id: str | None = Field(default=None, min_length=1, max_length=26)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    scope: InputScope | None = None
    input_schema: InputSchemaDTO | None = None


class OntologyOutputCreateDTO(StrictDTO):
    definition_id: str = Field(min_length=1, max_length=26)
    name: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    multiple: bool = False
    required: bool = True
    value_schema: dict[str, Any] | None = None


class OntologyOutputUpdateDTO(StrictDTO):
    definition_id: str | None = Field(default=None, min_length=1, max_length=26)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=2000)
    multiple: bool | None = None
    required: bool | None = None
    value_schema: dict[str, Any] | None = None


class CategoryCreateDTO(StrictDTO):
    key: str = Field(pattern=KEY_PATTERN, max_length=100)
    name: str = Field(min_length=1, max_length=255)
    color: str | None = Field(default=None, pattern=COLOR_PATTERN)
    description: str | None = Field(default=None, max_length=2000)


class CategoryUpdateDTO(StrictDTO):
    key: str | None = Field(default=None, pattern=KEY_PATTERN, max_length=100)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    color: str | None = Field(default=None, pattern=COLOR_PATTERN)
    description: str | None = Field(default=None, max_length=2000)


class OntologyVersionInputDTO(StrictDTO):
    input_id: str = Field(min_length=1, max_length=26)
    sort_order: int = Field(default=0, ge=0)


class OntologyVersionOutputDTO(StrictDTO):
    output_id: str = Field(min_length=1, max_length=26)
    input_id: str = Field(min_length=1, max_length=26)
    category_ids: list[str] = Field(default_factory=list, max_length=500)
    sort_order: int = Field(default=0, ge=0)


class OntologyCompositionUpdateDTO(StrictDTO):
    inputs: list[OntologyVersionInputDTO] = Field(default_factory=list)
    outputs: list[OntologyVersionOutputDTO] = Field(default_factory=list)

    @model_validator(mode="after")
    def reject_duplicates(self) -> "OntologyCompositionUpdateDTO":
        input_ids = [item.input_id for item in self.inputs]
        output_ids = [item.output_id for item in self.outputs]
        if len(input_ids) != len(set(input_ids)):
            raise ValueError("Input trong Version không được trùng.")
        if len(output_ids) != len(set(output_ids)):
            raise ValueError("Output trong Version không được trùng.")
        if any(
            len(item.category_ids) != len(set(item.category_ids))
            for item in self.outputs
        ):
            raise ValueError("Category nối vào cùng một Output không được trùng.")
        return self


class OntologyVersionCreateDTO(StrictDTO):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    # Legacy versions may still use 36-character IDs after the one-time migration.
    based_on_version_id: str | None = Field(default=None, max_length=36)


class OntologyVersionUpdateDTO(StrictDTO):
    name: str = Field(min_length=1, max_length=255)


class InputDefinitionResponseDTO(ResponseDTO):
    id: str
    code: str
    name: str
    description: str | None
    allowed_formats: list[str]


class OutputDefinitionResponseDTO(ResponseDTO):
    id: str
    code: str
    name: str
    description: str | None
    supports_categories: bool
    default_schema: dict[str, Any]


class OntologyInputResponseDTO(ResponseDTO):
    id: str
    ontology_id: str
    definition_id: str
    name: str
    description: str | None
    scope: InputScope
    input_schema: dict[str, Any]
    definition: InputDefinitionResponseDTO | None = None
    locked: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OntologyOutputResponseDTO(ResponseDTO):
    id: str
    ontology_id: str
    definition_id: str
    name: str
    description: str | None
    multiple: bool
    required: bool
    value_schema: dict[str, Any] | None
    definition: OutputDefinitionResponseDTO | None = None
    locked: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class CategoryResponseDTO(ResponseDTO):
    id: str
    ontology_id: str
    key: str
    name: str
    color: str | None
    description: str | None
    locked: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OntologyVersionInputResponseDTO(ResponseDTO):
    ontology_version_id: str
    ontology_input_id: str
    sort_order: int
    input: OntologyInputResponseDTO | None = None


class OntologyVersionOutputCategoryResponseDTO(ResponseDTO):
    category_id: str
    sort_order: int
    category: CategoryResponseDTO | None = None


class OntologyVersionOutputResponseDTO(ResponseDTO):
    ontology_version_id: str
    ontology_output_id: str
    ontology_input_id: str
    sort_order: int
    output: OntologyOutputResponseDTO | None = None
    input: OntologyInputResponseDTO | None = None
    categories: list[OntologyVersionOutputCategoryResponseDTO] = Field(
        default_factory=list
    )


class OntologyVersionResponseDTO(ResponseDTO):
    id: str
    ontology_id: str
    version_no: int
    name: str
    status: Literal["draft", "published"]
    based_on_version_id: str | None
    schema_hash: str | None
    published_at: datetime | None
    inputs: list[OntologyVersionInputResponseDTO] = Field(default_factory=list)
    outputs: list[OntologyVersionOutputResponseDTO] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class OntologyResponseDTO(ResponseDTO):
    id: str
    project_id: str
    name: str
    description: str | None
    current_version_id: str | None
    versions: list[OntologyVersionResponseDTO] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ValidationIssueDTO(ResponseDTO):
    path: str
    code: str
    message: str


class OntologyValidationResponseDTO(ResponseDTO):
    valid: bool
    issues: list[ValidationIssueDTO]


class OntologyVersionSchemaResponseDTO(StrictDTO):
    ontology_id: str
    ontology_version_id: str
    version_no: int
    version_name: str
    status: str
    schema_hash: str | None
    inputs: list[dict[str, Any]]
    outputs: list[dict[str, Any]]
