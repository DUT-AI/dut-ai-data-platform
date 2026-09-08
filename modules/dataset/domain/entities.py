from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

from core.utils.id_generator import generate_ulid

AssetStatus = Literal["READY", "RETIRED", "DELETED"]
DatasetStatus = Literal["active", "archived"]
DatasetVersionStatus = Literal["draft", "published", "deprecated"]


@dataclass
class AssetEntity:
    project_id: str
    filename: str
    uri: str
    mime_type: str
    file_size: int
    sha256: str
    id: str = field(default_factory=generate_ulid)
    metadata: dict[str, Any] | None = None
    data_format: str | None = None
    status: AssetStatus = "READY"
    provenance: dict[str, Any] | None = None
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    retired_at: datetime | None = None


@dataclass
class DatasetVersionAssetEntity:
    dataset_version_id: str
    asset_id: str
    id: str = field(default_factory=generate_ulid)
    sort_order: int = 0
    created_at: datetime | None = None
    updated_at: datetime | None = None
    asset: AssetEntity | None = None


@dataclass
class DatasetVersionEntity:
    dataset_id: str
    version: str
    id: str = field(default_factory=generate_ulid)
    version_number: int | None = None
    version_label: str | None = None
    parent_version_id: str | None = None
    status: DatasetVersionStatus = "draft"
    version_config: dict[str, Any] | None = None
    manifest_hash: str | None = None
    asset_count: int = 0
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    published_at: datetime | None = None
    assets: list[AssetEntity] = field(default_factory=list)


@dataclass
class DatasetEntity:
    project_id: str
    name: str
    id: str = field(default_factory=generate_ulid)
    description: str | None = None
    tags: list[str] = field(default_factory=list)
    status: DatasetStatus = "active"
    latest_published_version_number: int | None = None
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
    versions: list[DatasetVersionEntity] = field(default_factory=list)

