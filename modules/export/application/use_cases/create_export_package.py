import asyncio

from modules.export.application.dtos.export_dtos import ExportCreateRequest
from modules.export.domain.entities import ExportPackageEntity
from modules.export.domain.exceptions import ScaleLimitExceededError
from modules.export.domain.interfaces import (
    IExportPackageRepository,
    ISnapshotGateway,
)
from modules.export.domain.value_objects import MediaMode
from modules.export.infrastructure.background.export_worker import ExportWorker


class CreateExportPackageUseCase:
    """Use case to initiate an export from a finalized snapshot."""

    def __init__(
        self,
        package_repo: IExportPackageRepository,
        snapshot_gateway: ISnapshotGateway,
        worker: ExportWorker,
    ) -> None:
        self._package_repo = package_repo
        self._snapshot_gateway = snapshot_gateway
        self._worker = worker

    async def execute(
        self,
        project_id: str,
        snapshot_id: str,
        request: ExportCreateRequest,
        user_id: int,
    ) -> tuple[ExportPackageEntity, bool]:
        """Initiates export or returns existing idempotent package.

        Returns:
            (package_entity, is_newly_created)
        """
        # 1. Check idempotency
        existing = await self._package_repo.get_by_idempotency(
            snapshot_id=snapshot_id,
            format_type=request.format,
            target_output_id=request.target_output_id,
            media_mode=request.media_mode,
            annotated_only=request.annotated_only,
        )
        if existing:
            return existing, False

        # 2. Verify snapshot context & status
        context = await self._snapshot_gateway.get_export_context(snapshot_id)

        # 3. Pre-flight scale check
        if request.media_mode == MediaMode.FULL_BUNDLE and context.total_items > 5000:
            raise ScaleLimitExceededError(
                f"Full bundle export exceeds 5,000 files limit (snapshot has {context.total_items} items)."
            )

        # 4. Create new ExportPackageEntity
        package = ExportPackageEntity(
            project_id=project_id,
            snapshot_id=snapshot_id,
            format=request.format,
            target_output_id=request.target_output_id,
            media_mode=request.media_mode,
            annotated_only=request.annotated_only,
            created_by=user_id,
        )

        persisted = await self._package_repo.create(package)

        # 5. Dispatch background worker task
        asyncio.create_task(self._worker.execute(persisted.id))

        return persisted, True
