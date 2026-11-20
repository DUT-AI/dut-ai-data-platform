from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from modules.snapshot.domain.value_objects import SelectionPolicy, SplitStrategy


class SplitRatiosDTO(BaseModel):
    train: float = Field(0.70, ge=0.0, le=1.0)
    validation: float = Field(0.15, ge=0.0, le=1.0)
    test: float = Field(0.15, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def validate_sum(self) -> "SplitRatiosDTO":
        total = self.train + self.validation + self.test
        if abs(total - 1.0) > 1e-4:
            raise ValueError(f"Split ratios must sum to 1.0 (got {total:.4f})")
        return self


class SnapshotCreateRequest(BaseModel):
    dataset_version_id: str = Field(..., min_length=1, max_length=36)
    ontology_version_id: str = Field(..., min_length=1, max_length=36)
    version_name: str | None = Field(None, max_length=64)
    selection_policy: SelectionPolicy = SelectionPolicy.LATEST_APPROVED
    include_unannotated: bool = False
    split_strategy: SplitStrategy = SplitStrategy.STRATIFIED
    split_ratios: SplitRatiosDTO = Field(default_factory=SplitRatiosDTO)
    split_seed: int | None = 42


class SnapshotResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    dataset_version_id: str
    ontology_version_id: str
    version_name: str
    status: str
    selection_policy: str
    include_unannotated: bool
    split_strategy: str
    split_ratios: dict[str, float]
    split_seed: int | None = None
    tags: list[str] = Field(default_factory=list)
    error_code: str | None = None
    error_message: str | None = None
    created_by: int
    created_at: datetime
    finalized_at: datetime | None = None
    archived_at: datetime | None = None


class SnapshotListResponse(BaseModel):
    items: list[SnapshotResponse]
    total: int


class SnapshotCancelResponse(BaseModel):
    message: str
    snapshot: SnapshotResponse
