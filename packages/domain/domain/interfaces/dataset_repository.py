from collections.abc import Sequence
from typing import Protocol

from domain.entities import (
    AssetEntity,
    DatasetEntity,
    DatasetVersionAssetEntity,
    DatasetVersionEntity,
)


class IDatasetRepository(Protocol):
    async def save_dataset(self, dataset: DatasetEntity) -> DatasetEntity: ...

    async def get_dataset_by_id(self, dataset_id: str) -> DatasetEntity | None: ...

    async def list_datasets_by_project(
        self, project_id: str
    ) -> Sequence[DatasetEntity]: ...

    async def save_version(
        self, version: DatasetVersionEntity
    ) -> DatasetVersionEntity: ...

    async def get_version_by_id(
        self, version_id: str
    ) -> DatasetVersionEntity | None: ...

    async def list_versions_by_dataset(
        self, dataset_id: str
    ) -> Sequence[DatasetVersionEntity]: ...

    async def find_asset_by_sha256(
        self, project_id: str, sha256: str
    ) -> AssetEntity | None: ...

    async def save_asset(self, asset: AssetEntity) -> AssetEntity: ...

    async def get_asset_by_id(self, asset_id: str) -> AssetEntity | None: ...

    async def add_asset_to_version(
        self, version_id: str, asset_id: str, sort_order: int = 0
    ) -> DatasetVersionAssetEntity: ...

    async def remove_asset_from_version(
        self, version_id: str, asset_id: str
    ) -> bool: ...

    async def list_assets_by_version(
        self, version_id: str, limit: int = 100, offset: int = 0
    ) -> Sequence[AssetEntity]: ...

    async def get_version_asset_link(
        self, version_id: str, asset_id: str
    ) -> DatasetVersionAssetEntity | None: ...
