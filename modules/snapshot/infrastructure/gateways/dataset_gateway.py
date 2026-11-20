from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.dataset.models.dataset import AssetModel, DatasetVersionAssetModel
from modules.snapshot.domain.interfaces import DatasetAssetInfo, DatasetGateway
from modules.snapshot.domain.value_objects import SnapshotStatus
from modules.snapshot.infrastructure.persistence.models import (
    SnapshotItemModel,
    SnapshotModel,
)


class SqlDatasetGateway(DatasetGateway):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_version_assets(
        self, dataset_version_id: str
    ) -> Sequence[DatasetAssetInfo]:
        stmt = (
            select(
                AssetModel.id,
                AssetModel.sha256,
                AssetModel.uri,
                AssetModel.data_format,
            )
            .join(
                DatasetVersionAssetModel,
                DatasetVersionAssetModel.asset_id == AssetModel.id,
            )
            .where(DatasetVersionAssetModel.dataset_version_id == dataset_version_id)
            .order_by(DatasetVersionAssetModel.sort_order.asc(), AssetModel.id.asc())
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            DatasetAssetInfo(
                asset_id=row.id,
                sha256=row.sha256,
                uri=row.uri,
                data_format=row.data_format,
            )
            for row in rows
        ]

    async def has_active_snapshot_references(self, asset_id: str) -> bool:
        active_statuses = [
            SnapshotStatus.CREATING.value,
            SnapshotStatus.READY.value,
            SnapshotStatus.ARCHIVED.value,
        ]
        stmt = (
            select(SnapshotItemModel.id)
            .join(SnapshotModel, SnapshotModel.id == SnapshotItemModel.snapshot_id)
            .where(
                SnapshotItemModel.asset_id == asset_id,
                SnapshotModel.status.in_(active_statuses),
            )
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none() is not None
