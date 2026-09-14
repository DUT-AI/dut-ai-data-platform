import hashlib
import json
from collections.abc import Sequence

from core.exceptions import BadRequestException
from modules.dataset.domain.entities import AssetEntity, DatasetEntity, DatasetVersionEntity


class DatasetVersionPolicy:
    """Domain Policy enforcing rules on DatasetVersion lifecycle, membership, and immutability."""

    @staticmethod
    def ensure_can_modify_draft(version: DatasetVersionEntity) -> None:
        """Validate that a version is in draft status to allow modifications."""
        if version.status != "draft":
            raise BadRequestException(
                f"Cannot modify version '{version.id}' with status '{version.status}'. Only DRAFT versions can be modified."
            )

    @staticmethod
    def ensure_can_publish(dataset: DatasetEntity, version: DatasetVersionEntity) -> None:
        """Validate all preconditions before publishing a version."""
        if dataset.status != "active":
            raise BadRequestException(
                f"Cannot publish version for dataset '{dataset.id}' with status '{dataset.status}'. Dataset must be ACTIVE."
            )

        if version.status != "draft":
            raise BadRequestException(
                f"Cannot publish version '{version.id}' with status '{version.status}'. Version is already published or deprecated."
            )

    @staticmethod
    def compute_manifest_hash(
        version: DatasetVersionEntity,
        assets: Sequence[AssetEntity],
        config: dict | None = None,
    ) -> str:
        """Compute SHA-256 manifest hash for canonical version membership and configuration.

        Ensures strict reproducibility and integrity protection as required by Spec v1.
        """
        sorted_assets = sorted(assets, key=lambda a: a.id)
        asset_manifest_lines = [
            f"{asset.id}:{asset.sha256}:{asset.file_size}:{asset.mime_type}"
            for asset in sorted_assets
        ]

        normalized_config = json.dumps(config or {}, sort_keys=True, separators=(",", ":"))
        canonical_content = (
            f"version_id:{version.id}\n"
            f"dataset_id:{version.dataset_id}\n"
            f"version:{version.version}\n"
            f"config:{normalized_config}\n"
            f"assets:\n" + "\n".join(asset_manifest_lines)
        )

        return hashlib.sha256(canonical_content.encode("utf-8")).hexdigest()


class AssetDeletionPolicy:
    """Domain Policy enforcing rules on Asset lifecycle and deletion safety."""

    @staticmethod
    def ensure_can_retire(asset: AssetEntity, version_link_count: int) -> None:
        """Validate if an asset can transition to RETIRED state.

        An asset cannot be retired if it still has protected references in dataset versions.
        """
        if asset.status == "DELETED":
            raise BadRequestException(f"Cannot retire asset '{asset.id}' with status 'DELETED'.")

        if version_link_count > 0:
            raise BadRequestException(
                f"Cannot retire asset '{asset.id}'. It is still linked to {version_link_count} dataset version(s)."
            )
