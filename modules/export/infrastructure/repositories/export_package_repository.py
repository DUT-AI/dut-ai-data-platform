from collections.abc import Sequence

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.export.domain.entities import ExportPackageEntity
from modules.export.domain.interfaces import IExportPackageRepository
from modules.export.domain.value_objects import (
    ExportFormatType,
    ExportStatus,
    MediaMode,
)
from modules.export.infrastructure.persistence.models import ExportPackageModel


def _to_entity(model: ExportPackageModel) -> ExportPackageEntity:
    return ExportPackageEntity(
        id=model.id,
        project_id=model.project_id,
        snapshot_id=model.snapshot_id,
        format=ExportFormatType(model.format),
        target_output_id=model.target_output_id,
        media_mode=MediaMode(model.media_mode),
        annotated_only=model.annotated_only,
        status=ExportStatus(model.status),
        storage_uri=model.storage_uri,
        checksum=model.checksum,
        file_size_bytes=model.file_size_bytes,
        item_count=model.item_count,
        error_code=model.error_code,
        error_message=model.error_message,
        created_by=model.created_by,
        created_at=model.created_at,
        finalized_at=model.finalized_at,
    )


class SqlExportPackageRepository(IExportPackageRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, package: ExportPackageEntity) -> ExportPackageEntity:
        model = ExportPackageModel(
            id=package.id,
            project_id=package.project_id,
            snapshot_id=package.snapshot_id,
            format=package.format.value,
            target_output_id=package.target_output_id,
            media_mode=package.media_mode.value,
            annotated_only=package.annotated_only,
            status=package.status.value,
            storage_uri=package.storage_uri,
            checksum=package.checksum,
            file_size_bytes=package.file_size_bytes,
            item_count=package.item_count,
            error_code=package.error_code,
            error_message=package.error_message,
            created_by=package.created_by,
            created_at=package.created_at,
            finalized_at=package.finalized_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def get_by_id(self, package_id: str) -> ExportPackageEntity | None:
        stmt = select(ExportPackageModel).where(ExportPackageModel.id == package_id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _to_entity(model) if model else None

    async def get_by_idempotency(
        self,
        snapshot_id: str,
        format_type: ExportFormatType,
        target_output_id: str | None,
        media_mode: MediaMode,
        annotated_only: bool,
    ) -> ExportPackageEntity | None:
        stmt = select(ExportPackageModel).where(
            ExportPackageModel.snapshot_id == snapshot_id,
            ExportPackageModel.format == format_type.value,
            ExportPackageModel.target_output_id == target_output_id,
            ExportPackageModel.media_mode == media_mode.value,
            ExportPackageModel.annotated_only == annotated_only,
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        return _to_entity(model) if model else None

    async def list_by_project(
        self,
        project_id: str,
        snapshot_id: str | None = None,
        status: ExportStatus | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[ExportPackageEntity], int]:
        filters = [ExportPackageModel.project_id == project_id]
        if snapshot_id:
            filters.append(ExportPackageModel.snapshot_id == snapshot_id)
        if status:
            filters.append(ExportPackageModel.status == status.value)

        # Count total
        count_stmt = (
            select(func.count()).select_from(ExportPackageModel).where(*filters)
        )
        total = (await self._session.execute(count_stmt)).scalar_one() or 0

        # Query items
        stmt = (
            select(ExportPackageModel)
            .where(*filters)
            .order_by(ExportPackageModel.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        result = await self._session.execute(stmt)
        models = result.scalars().all()
        return [_to_entity(m) for m in models], total

    async def update(self, package: ExportPackageEntity) -> ExportPackageEntity:
        stmt = select(ExportPackageModel).where(ExportPackageModel.id == package.id)
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return package

        model.status = package.status.value
        model.storage_uri = package.storage_uri
        model.checksum = package.checksum
        model.file_size_bytes = package.file_size_bytes
        model.item_count = package.item_count
        model.error_code = package.error_code
        model.error_message = package.error_message
        model.finalized_at = package.finalized_at

        await self._session.flush()
        return _to_entity(model)

    async def delete(self, package_id: str) -> bool:
        stmt = delete(ExportPackageModel).where(ExportPackageModel.id == package_id)
        result = await self._session.execute(stmt)
        await self._session.flush()
        rowcount = getattr(result, "rowcount", 0) or 0
        return rowcount > 0
