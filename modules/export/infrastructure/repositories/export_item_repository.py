from collections.abc import Sequence

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from modules.export.domain.entities import ExportItemEntity
from modules.export.domain.interfaces import IExportItemRepository
from modules.export.infrastructure.persistence.models import ExportItemModel


def _to_entity(model: ExportItemModel) -> ExportItemEntity:
    return ExportItemEntity(
        id=model.id,
        export_package_id=model.export_package_id,
        source_asset_id=model.source_asset_id,
        source_annotation_revision_id=model.source_annotation_revision_id,
        target_path=model.target_path,
        split=model.split,
        checksum=model.checksum,
        metadata=model.metadata_,
    )


class SqlExportItemRepository(IExportItemRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def bulk_create(self, items: Sequence[ExportItemEntity]) -> int:
        if not items:
            return 0

        batch_size = 1000
        total_inserted = 0

        for i in range(0, len(items), batch_size):
            chunk = items[i : i + batch_size]
            dicts = [
                {
                    "id": item.id,
                    "export_package_id": item.export_package_id,
                    "source_asset_id": item.source_asset_id,
                    "source_annotation_revision_id": item.source_annotation_revision_id,
                    "target_path": item.target_path,
                    "split": item.split,
                    "checksum": item.checksum,
                    "metadata": item.metadata,
                }
                for item in chunk
            ]
            stmt = pg_insert(ExportItemModel).values(dicts)
            await self._session.execute(stmt)
            total_inserted += len(chunk)

        await self._session.flush()
        return total_inserted

    async def list_by_package(
        self,
        package_id: str,
        limit: int = 100,
        offset: int = 0,
    ) -> Sequence[ExportItemEntity]:
        stmt = (
            select(ExportItemModel)
            .where(ExportItemModel.export_package_id == package_id)
            .order_by(ExportItemModel.id.asc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [_to_entity(m) for m in models]

    async def count_by_package(self, package_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(ExportItemModel)
            .where(ExportItemModel.export_package_id == package_id)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() or 0
