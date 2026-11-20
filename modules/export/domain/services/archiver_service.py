import hashlib
import io
import json
import zipfile
from datetime import UTC, datetime
from typing import Any

from modules.export.domain.entities import ExportItemEntity
from modules.export.domain.services.base_exporter import ExportArtifact


class ArchiverService:
    """Service responsible for creating standard, reproducible ZIP bundles with manifests."""

    def create_archive(
        self,
        package_id: str,
        snapshot_id: str,
        project_id: str,
        format_name: str,
        artifacts: list[ExportArtifact],
        additional_manifest: dict[str, Any] | None = None,
    ) -> tuple[bytes, str, int, list[ExportItemEntity]]:
        """Assemble artifacts into a ZIP stream with manifest.json and calculate SHA-256.

        Returns:
            (zip_bytes, sha256_checksum, file_size_bytes, item_records)
        """
        buffer = io.BytesIO()
        item_records: list[ExportItemEntity] = []
        files_manifest: list[dict[str, Any]] = []

        with zipfile.ZipFile(buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
            for art in artifacts:
                raw_bytes = (
                    art.content.encode("utf-8")
                    if isinstance(art.content, str)
                    else art.content
                )
                item_checksum = hashlib.sha256(raw_bytes).hexdigest()

                zf.writestr(art.relative_path, raw_bytes)

                files_manifest.append(
                    {
                        "path": art.relative_path,
                        "sha256": item_checksum,
                        "size_bytes": len(raw_bytes),
                        "is_media": art.is_media,
                    }
                )

                if art.source_asset_id:
                    item_records.append(
                        ExportItemEntity(
                            export_package_id=package_id,
                            source_asset_id=art.source_asset_id,
                            source_annotation_revision_id=art.source_annotation_revision_id,
                            target_path=art.relative_path,
                            split=art.split,
                            checksum=item_checksum,
                            metadata=art.metadata,
                        )
                    )

            # Build and inject internal manifest.json
            manifest_data = {
                "package_id": package_id,
                "snapshot_id": snapshot_id,
                "project_id": project_id,
                "format": format_name,
                "created_at": datetime.now(UTC).isoformat(),
                "total_files": len(files_manifest) + 1,
                "files": files_manifest,
            }
            if additional_manifest:
                manifest_data.update(additional_manifest)

            manifest_bytes = json.dumps(manifest_data, indent=2).encode("utf-8")
            zf.writestr("manifest.json", manifest_bytes)

        zip_bytes = buffer.getvalue()
        sha256_checksum = hashlib.sha256(zip_bytes).hexdigest()
        file_size_bytes = len(zip_bytes)

        return zip_bytes, sha256_checksum, file_size_bytes, item_records
