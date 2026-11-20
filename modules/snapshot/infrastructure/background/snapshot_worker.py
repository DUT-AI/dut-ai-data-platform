import asyncio
import json
from collections import Counter
from datetime import UTC, datetime

from core.utils.id_generator import generate_ulid
from modules.snapshot.domain.entities import (
    SnapshotEntity,
    SnapshotItemEntity,
    SnapshotManifestEntity,
)
from modules.snapshot.domain.interfaces import (
    AnnotationGateway,
    ChecksumService,
    DatasetGateway,
    OntologyGateway,
    SnapshotItemRepository,
    SnapshotManifestRepository,
    SnapshotRepository,
    StorageGateway,
    StratificationService,
)
from modules.snapshot.domain.value_objects import (
    SnapshotStatus,
    SplitStrategy,
)

# In-memory cancellation registry
_cancelled_snapshots: set[str] = set()


def request_snapshot_cancellation(snapshot_id: str) -> None:
    _cancelled_snapshots.add(snapshot_id)


def is_snapshot_cancelled(snapshot_id: str) -> bool:
    return snapshot_id in _cancelled_snapshots


def clear_snapshot_cancellation(snapshot_id: str) -> None:
    _cancelled_snapshots.discard(snapshot_id)


class SnapshotWorker:
    def __init__(
        self,
        snapshot_repo: SnapshotRepository,
        snapshot_item_repo: SnapshotItemRepository,
        manifest_repo: SnapshotManifestRepository,
        dataset_gateway: DatasetGateway,
        annotation_gateway: AnnotationGateway,
        ontology_gateway: OntologyGateway,
        storage_gateway: StorageGateway,
        checksum_service: ChecksumService,
        stratification_service: StratificationService,
        timeout_seconds: int = 3600,
    ) -> None:
        self._snapshot_repo = snapshot_repo
        self._snapshot_item_repo = snapshot_item_repo
        self._manifest_repo = manifest_repo
        self._dataset_gateway = dataset_gateway
        self._annotation_gateway = annotation_gateway
        self._ontology_gateway = ontology_gateway
        self._storage_gateway = storage_gateway
        self._checksum_service = checksum_service
        self._stratification_service = stratification_service
        self._timeout_seconds = timeout_seconds

    async def execute(self, snapshot_id: str) -> SnapshotEntity:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot:
            raise ValueError(f"Snapshot '{snapshot_id}' does not exist.")

        if snapshot.status != SnapshotStatus.CREATING:
            return snapshot

        manifest_uri: str | None = None

        try:
            async with asyncio.timeout(self._timeout_seconds):
                # 1. Check cancellation hook
                if is_snapshot_cancelled(snapshot_id):
                    return await self._handle_cancellation(snapshot)

                # 2. Fetch dataset version assets
                version_assets = await self._dataset_gateway.get_version_assets(
                    snapshot.dataset_version_id
                )
                if not version_assets:
                    snapshot.mark_failed(
                        error_code="dataset_version_empty",
                        error_message="Dataset version contains 0 assets.",
                    )
                    return await self._snapshot_repo.update(snapshot)

                asset_id_map = {a.asset_id: a for a in version_assets}
                asset_ids = [a.asset_id for a in version_assets]

                if is_snapshot_cancelled(snapshot_id):
                    return await self._handle_cancellation(snapshot)

                # 3. Resolve annotations
                resolved_annotations = await self._annotation_gateway.resolve_revisions(
                    asset_ids=asset_ids,
                    policy=snapshot.selection_policy.value,
                )

                # 4. Filter based on include_unannotated
                target_asset_ids: list[str] = []
                for aid in asset_ids:
                    res = resolved_annotations.get(aid)
                    if res is not None or snapshot.include_unannotated:
                        target_asset_ids.append(aid)

                if not target_asset_ids:
                    snapshot.mark_failed(
                        error_code="dataset_version_empty",
                        error_message="No matching assets found for snapshot selection policy.",
                    )
                    return await self._snapshot_repo.update(snapshot)

                # 5. Validate ontology compatibility
                annotated_rev_ids = [
                    resolved_annotations[aid].annotation_revision_id
                    for aid in target_asset_ids
                    if resolved_annotations.get(aid) is not None
                ]
                is_valid, ont_errors = await self._ontology_gateway.validate_revisions(
                    ontology_version_id=snapshot.ontology_version_id,
                    revision_ids=annotated_rev_ids,
                )
                if not is_valid:
                    snapshot.mark_failed(
                        error_code="ontology_incompatibility",
                        error_message="; ".join(ont_errors),
                    )
                    return await self._snapshot_repo.update(snapshot)

                if is_snapshot_cancelled(snapshot_id):
                    return await self._handle_cancellation(snapshot)

                # 6. Assign splits
                if snapshot.split_strategy == SplitStrategy.STRATIFIED:
                    asset_labels = {
                        aid: (
                            resolved_annotations[aid].labels
                            if resolved_annotations.get(aid)
                            else []
                        )
                        for aid in target_asset_ids
                    }
                    split_assignments = (
                        self._stratification_service.assign_splits_stratified(
                            asset_labels=asset_labels,
                            split_ratios=snapshot.split_ratios,
                            seed=snapshot.split_seed,
                        )
                    )
                else:
                    split_assignments = (
                        self._stratification_service.assign_splits_random(
                            asset_ids=target_asset_ids,
                            split_ratios=snapshot.split_ratios,
                            seed=snapshot.split_seed,
                        )
                    )

                if is_snapshot_cancelled(snapshot_id):
                    return await self._handle_cancellation(snapshot)

                # 7. Construct Snapshot Items and compute item checksums
                items: list[SnapshotItemEntity] = []
                item_checksums: list[str] = []

                for idx, aid in enumerate(target_asset_ids):
                    asset_info = asset_id_map[aid]
                    res = resolved_annotations.get(aid)
                    rev_id = res.annotation_revision_id if res else None
                    split_name = split_assignments.get(aid, "train")

                    item_chk = self._checksum_service.compute_item_checksum(
                        asset_id=aid,
                        asset_checksum=asset_info.sha256,
                        annotation_revision_id=rev_id,
                        split=split_name,
                    )
                    item_checksums.append(item_chk)

                    item_entity = SnapshotItemEntity(
                        id=generate_ulid(),
                        snapshot_id=snapshot.id,
                        asset_id=aid,
                        annotation_revision_id=rev_id,
                        split=split_name,
                        item_checksum=item_chk,
                        sort_order=idx,
                    )
                    items.append(item_entity)

                # Compute aggregate digest
                aggregate_checksum = self._checksum_service.compute_aggregate_checksum(
                    item_checksums
                )

                if is_snapshot_cancelled(snapshot_id):
                    return await self._handle_cancellation(snapshot)

                # 8. Persist items in bulk
                await self._snapshot_item_repo.bulk_create(items)

                # 9. Compute manifest distribution statistics
                total_assets = len(items)
                total_annotations = sum(
                    1 for item in items if item.annotation_revision_id is not None
                )

                split_dist: dict[str, dict[str, float]] = {}
                for s in ["train", "validation", "test"]:
                    count = sum(1 for item in items if item.split == s)
                    ratio = round(count / total_assets, 4) if total_assets > 0 else 0.0
                    split_dist[s] = {"count": count, "ratio": ratio}

                class_dist: dict[str, dict[str, int]] = {
                    s: Counter() for s in ["train", "validation", "test"]
                }
                for item in items:
                    res = resolved_annotations.get(item.asset_id)
                    if res:
                        for lbl in res.labels:
                            class_dist[item.split][lbl] += 1

                class_dist_dict = {
                    s: dict(class_dist[s]) for s in ["train", "validation", "test"]
                }

                # 10. Generate Canonical Manifest JSON and Upload to S3
                created_at_dt = snapshot.created_at or datetime.now(UTC)
                manifest_payload = {
                    "snapshot_id": snapshot.id,
                    "dataset_version_id": snapshot.dataset_version_id,
                    "ontology_version_id": snapshot.ontology_version_id,
                    "asset_count": total_assets,
                    "annotation_count": total_annotations,
                    "split_distribution": split_dist,
                    "class_distribution": class_dist_dict,
                    "aggregate_checksum": aggregate_checksum,
                    "created_at": created_at_dt.isoformat(),
                }
                canonical_manifest_bytes = json.dumps(
                    manifest_payload, sort_keys=True, indent=2
                ).encode("utf-8")

                manifest_path = f"projects/{snapshot.project_id}/snapshots/{snapshot.id}/manifest.json"
                manifest_uri = await self._storage_gateway.upload_manifest(
                    path=manifest_path,
                    content=canonical_manifest_bytes,
                )

                # 11. Create Manifest Record
                manifest_entity = SnapshotManifestEntity(
                    id=generate_ulid(),
                    snapshot_id=snapshot.id,
                    dataset_version_id=snapshot.dataset_version_id,
                    ontology_version_id=snapshot.ontology_version_id,
                    asset_count=total_assets,
                    annotation_count=total_annotations,
                    split_distribution=split_dist,
                    class_distribution=class_dist_dict,
                    aggregate_checksum=aggregate_checksum,
                    storage_uri=manifest_uri,
                    created_at=snapshot.created_at,
                )
                await self._manifest_repo.create(manifest_entity)

                # 12. Finalize Snapshot state to READY
                snapshot.mark_ready()
                updated_snapshot = await self._snapshot_repo.update(snapshot)
                clear_snapshot_cancellation(snapshot_id)
                return updated_snapshot

        except TimeoutError:
            snapshot.mark_failed(
                error_code="creation_timeout",
                error_message="Background worker exceeded 60-minute hard ceiling.",
            )
            await self._cleanup_failed_artifacts(snapshot.id, manifest_uri)
            return await self._snapshot_repo.update(snapshot)

        except Exception as ex:
            snapshot.mark_failed(
                error_code="snapshot_creation_error",
                error_message=str(ex),
            )
            await self._cleanup_failed_artifacts(snapshot.id, manifest_uri)
            return await self._snapshot_repo.update(snapshot)

    async def _handle_cancellation(self, snapshot: SnapshotEntity) -> SnapshotEntity:
        snapshot.mark_failed(
            error_code="cancelled_by_user",
            error_message="Snapshot creation gracefully cancelled by user request.",
        )
        await self._cleanup_failed_artifacts(snapshot.id, None)
        clear_snapshot_cancellation(snapshot.id)
        return await self._snapshot_repo.update(snapshot)

    async def _cleanup_failed_artifacts(
        self, snapshot_id: str, manifest_uri: str | None
    ) -> None:
        try:
            await self._snapshot_item_repo.delete_by_snapshot(snapshot_id)
            if manifest_uri:
                await self._storage_gateway.delete_object(manifest_uri)
        except Exception:  # noqa: S110
            pass
