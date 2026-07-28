from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class ProjectCreateDTO(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    project_type: Literal[
        "detection", "ocr", "nlp", "classification", "segmentation", "captioning"
    ]


class ProjectUpdateDTO(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    status: Literal["active", "archived"] | None = None


class ProjectResponseDTO(BaseModel):
    id: str
    name: str
    description: str | None = None
    project_type: str
    owner_id: str
    status: str
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class ProjectMemberAddDTO(BaseModel):
    user_id: str
    role: Literal["admin", "annotator", "reviewer"]
