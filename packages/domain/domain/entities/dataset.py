from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

DatasetStatus = Literal["active", "archived"]
DatasetVersionStatus = Literal["draft", "published"]


@dataclass
class AssetEntity:
    id: str
    project_id: str
    filename: str
    uri: str
    mime_type: str
    file_size: int
    sha256: str
    metadata: dict[str, Any] | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass
class DatasetVersionAssetEntity:
    id: str
    dataset_version_id: str
    asset_id: str
    sort_order: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    asset: AssetEntity | None = None


@dataclass
class DatasetVersionEntity:
    id: str
    dataset_id: str
    version: str
    status: DatasetVersionStatus = "draft"
    asset_count: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_at: datetime | None = None
    assets: list[AssetEntity] = field(default_factory=list)


@dataclass
class DatasetEntity:
    id: str
    project_id: str
    name: str
    description: str | None = None
    status: DatasetStatus = "active"
    created_at: datetime | None = None
    updated_at: datetime | None = None
    versions: list[DatasetVersionEntity] = field(default_factory=list)
