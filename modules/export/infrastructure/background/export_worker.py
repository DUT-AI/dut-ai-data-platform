import io
import logging
from typing import Any

from modules.export.domain.exceptions import (
    IncompatibleFormatError,
    ScaleLimitExceededError,
)
from modules.export.domain.interfaces import (
    IExportItemRepository,
    IExportPackageRepository,
    ISnapshotGateway,
    IStorageGateway,
)
from modules.export.domain.services.archiver_service import (
    ArchiverService,
    ExportArtifact,
)
from modules.export.domain.services.base_exporter import IFormatExporter
from modules.export.domain.services.canonical_exporter import (
    CanonicalJsonExporter,
)
from modules.export.domain.services.yolo_exporter import YoloExporter
from modules.export.domain.value_objects import (
    ExportFormatType,
    ExportStatus,
    MediaMode,
)

logger = logging.getLogger(__name__)


class ExportWorker:
    """Background processor transforming snapshot items into immutable export packages."""

    def __init__(
        self,
        package_repo: IExportPackageRepository,
        item_repo: IExportItemRepository,
        snapshot_gateway: ISnapshotGateway,
        storage_gateway: IStorageGateway,
        archiver_service: ArchiverService | None = None,
    ) -> None:
        self._package_repo = package_repo
        self._item_repo = item_repo
        self._snapshot_gateway = snapshot_gateway
        self._storage_gateway = storage_gateway
        self._archiver = archiver_service or ArchiverService()

    def _get_exporter(
        self,
        format_type: ExportFormatType,
        context: Any,
        target_output_id: str | None,
    ) -> IFormatExporter:
        if format_type == ExportFormatType.YOLO:
            return YoloExporter(context=context, target_output_id=target_output_id)
        if format_type == ExportFormatType.CANONICAL_JSON:
            return CanonicalJsonExporter(
                context=context, target_output_id=target_output_id, as_jsonl=False
            )
        if format_type == ExportFormatType.CANONICAL_JSONL:
            return CanonicalJsonExporter(
                context=context, target_output_id=target_output_id, as_jsonl=True
            )
        if format_type == ExportFormatType.COCO:
            from modules.export.domain.services.coco_exporter import CocoExporter

            return CocoExporter(context=context, target_output_id=target_output_id)
        if format_type == ExportFormatType.CSV:
            from modules.export.domain.services.csv_exporter import CsvExporter

            return CsvExporter(context=context, target_output_id=target_output_id)

        raise IncompatibleFormatError(
            f"Unsupported export format '{format_type.value}'"
        )

    async def execute(self, package_id: str) -> None:
        package = await self._package_repo.get_by_id(package_id)
        if not package:
            logger.error(
                "Export package '%s' not found for worker execution.", package_id
            )
            return

        if package.status != ExportStatus.PROCESSING:
            logger.info(
                "Export package '%s' status is %s; skipping.",
                package_id,
                package.status,
            )
            return

        try:
            # 1. Load snapshot export context
            context = await self._snapshot_gateway.get_export_context(
                package.snapshot_id
            )

            # 2. Enforce scale limit for full_bundle mode
            if (
                package.media_mode == MediaMode.FULL_BUNDLE
                and context.total_items > 5000
            ):
                raise ScaleLimitExceededError(
                    f"Full bundle export contains {context.total_items} items, exceeding the 5,000 files limit."
                )

            # 3. Resolve format exporter
            exporter = self._get_exporter(
                package.format,
                context=context,
                target_output_id=package.target_output_id,
            )

            # 4. Stream and export items
            artifacts: list[ExportArtifact] = []
            total_media_bytes = 0

            async for item in self._snapshot_gateway.stream_snapshot_items(
                snapshot_id=package.snapshot_id,
                annotated_only=package.annotated_only,
            ):
                item_artifacts = exporter.export_item(item)
                artifacts.extend(item_artifacts)

                # If full_bundle mode, include original asset file
                if package.media_mode == MediaMode.FULL_BUNDLE and item.asset.uri:
                    asset_stream = await self._snapshot_gateway.get_asset_stream(
                        item.asset.uri
                    )
                    media_bytes = asset_stream.read()
                    total_media_bytes += len(media_bytes)

                    # Scale guard check: 2 GB
                    if total_media_bytes > 2 * 1024 * 1024 * 1024:
                        raise ScaleLimitExceededError(
                            "Full bundle export exceeds 2 GB total size limit."
                        )

                    split_dir = (
                        item.split
                        if item.split in ("train", "val", "validation", "test")
                        else "default"
                    )
                    if split_dir == "validation":
                        split_dir = "val"

                    ext = (
                        item.asset.data_format.lower()
                        if item.asset.data_format
                        else "jpg"
                    )
                    if not ext.startswith("."):
                        ext = f".{ext}"

                    media_path = f"images/{split_dir}/{item.asset_id}{ext}"
                    artifacts.append(
                        ExportArtifact(
                            relative_path=media_path,
                            content=media_bytes,
                            is_media=True,
                            source_asset_id=item.asset_id,
                            source_annotation_revision_id=item.annotation_revision_id,
                            split=item.split,
                            metadata={"file_size": len(media_bytes)},
                        )
                    )

            # 5. Generate format-specific extra files (e.g. data.yaml)
            extra_files = exporter.generate_extra_files()
            artifacts.extend(extra_files)

            # 6. Create ZIP archive
            zip_bytes, sha256_hash, file_size, item_records = (
                self._archiver.create_archive(
                    package_id=package.id,
                    snapshot_id=package.snapshot_id,
                    project_id=package.project_id,
                    format_name=package.format.value,
                    artifacts=artifacts,
                    additional_manifest={
                        "version_name": context.version_name,
                        "media_mode": package.media_mode.value,
                        "annotated_only": package.annotated_only,
                        "target_output_id": package.target_output_id,
                    },
                )
            )

            # 7. Upload to S3/MinIO
            storage_uri = await self._storage_gateway.upload_package(
                project_id=package.project_id,
                package_id=package.id,
                file_path_or_stream=io.BytesIO(zip_bytes),
            )

            # 8. Persist item lineage
            if item_records:
                await self._item_repo.bulk_create(item_records)

            # 9. Mark package ready
            package.mark_ready(
                storage_uri=storage_uri,
                checksum=sha256_hash,
                file_size_bytes=file_size,
                item_count=len(item_records),
            )
            await self._package_repo.update(package)
            logger.info(
                "Export package '%s' marked READY (%d items, %d bytes).",
                package.id,
                len(item_records),
                file_size,
            )

        except Exception as exc:
            logger.exception(
                "Failed to process export package '%s'", package.id
            )
            package.mark_failed(
                error_code="EXPORT_PROCESSING_FAILED",
                error_message=str(exc),
            )
            await self._package_repo.update(package)
