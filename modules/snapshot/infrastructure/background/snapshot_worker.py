import asyncio
import json
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime

from loguru import logger

from core.uow import IUnitOfWork
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


class SnapshotBuildFailure(Exception):
    """An expected reason to stop building (empty dataset, cancelled...)."""

    def __init__(self, error_code: str, error_message: str) -> None:
        super().__init__(error_message)
        self.error_code = error_code
        self.error_message = error_message


@dataclass
class _RunArtifacts:
    """What one run created outside the database and must undo on failure."""

    manifest_uri: str | None = None


class SnapshotWorker:
    """Builds one snapshot as a single unit of work.

    Every database write of a run (items, manifest record, READY status) is
    committed together through ``IUnitOfWork``. On any failure, timeout or
    cancellation the transaction is rolled back, the manifest already uploaded
    to storage is deleted, and the FAILED status is recorded in a new
    transaction, so a failed run leaves neither rows nor objects behind.

    The worker must own its session: give it repositories and a unit of work
    built from a session that is not shared with an HTTP request
    (see ``SnapshotJobRunner``).
    """

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
        uow: IUnitOfWork,
        timeout_seconds: float = 3600,
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
        self._uow = uow
        self._timeout_seconds = timeout_seconds

    async def execute(self, snapshot_id: str) -> SnapshotEntity:
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if not snapshot:
            raise ValueError(f"Snapshot '{snapshot_id}' does not exist.")

        if snapshot.status != SnapshotStatus.CREATING:
            return snapshot

        artifacts = _RunArtifacts()
        try:
            async with asyncio.timeout(self._timeout_seconds):
                await self._build(snapshot, artifacts)
                self._raise_if_cancelled(snapshot_id)
                snapshot.mark_ready()
                updated_snapshot = await self._snapshot_repo.update(snapshot)
            # Commit outside the timeout: a commit interrupted half-way would
            # leave its outcome unknown.
            await self._uow.commit()
        except TimeoutError:
            return await self._fail(
                snapshot_id,
                artifacts,
                "creation_timeout",
                f"Background worker exceeded the {self._timeout_seconds}s hard ceiling.",
            )
        except SnapshotBuildFailure as failure:
            return await self._fail(
                snapshot_id, artifacts, failure.error_code, failure.error_message
            )
        except Exception as ex:
            return await self._fail(
                snapshot_id, artifacts, "snapshot_creation_error", str(ex)
            )
        except BaseException:
            # Task cancelled (e.g. shutdown): undo what we can, then let it propagate.
            await self._rollback_and_cleanup(snapshot_id, artifacts)
            raise

        clear_snapshot_cancellation(snapshot_id)
        return updated_snapshot

    def _raise_if_cancelled(self, snapshot_id: str) -> None:
        if is_snapshot_cancelled(snapshot_id):
            raise SnapshotBuildFailure(
                "cancelled_by_user",
                "Snapshot creation gracefully cancelled by user request.",
            )

    async def _build(self, snapshot: SnapshotEntity, artifacts: _RunArtifacts) -> None:
        """Steps 1-11: every DB write here is only flushed, never committed."""
        snapshot_id = snapshot.id

        # 1. Check cancellation hook
        self._raise_if_cancelled(snapshot_id)

        # 2. Fetch dataset version assets
        version_assets = await self._dataset_gateway.get_version_assets(
            snapshot.dataset_version_id
        )
        if not version_assets:
            raise SnapshotBuildFailure(
                "dataset_version_empty", "Dataset version contains 0 assets."
            )

        asset_id_map = {a.asset_id: a for a in version_assets}
        asset_ids = [a.asset_id for a in version_assets]

        self._raise_if_cancelled(snapshot_id)

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
            raise SnapshotBuildFailure(
                "dataset_version_empty",
                "No matching assets found for snapshot selection policy.",
            )

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
            raise SnapshotBuildFailure("ontology_incompatibility", "; ".join(ont_errors))

        self._raise_if_cancelled(snapshot_id)

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
            split_assignments = self._stratification_service.assign_splits_stratified(
                asset_labels=asset_labels,
                split_ratios=snapshot.split_ratios,
                seed=snapshot.split_seed,
            )
        else:
            split_assignments = self._stratification_service.assign_splits_random(
                asset_ids=target_asset_ids,
                split_ratios=snapshot.split_ratios,
                seed=snapshot.split_seed,
            )

        self._raise_if_cancelled(snapshot_id)

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

            items.append(
                SnapshotItemEntity(
                    id=generate_ulid(),
                    snapshot_id=snapshot.id,
                    asset_id=aid,
                    annotation_revision_id=rev_id,
                    split=split_name,
                    item_checksum=item_chk,
                    sort_order=idx,
                )
            )

        # Compute aggregate digest
        aggregate_checksum = self._checksum_service.compute_aggregate_checksum(
            item_checksums
        )

        self._raise_if_cancelled(snapshot_id)

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

        class_dist: dict[str, Counter] = {
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

        manifest_path = (
            f"projects/{snapshot.project_id}/snapshots/{snapshot.id}/manifest.json"
        )
        artifacts.manifest_uri = await self._storage_gateway.upload_manifest(
            path=manifest_path,
            content=canonical_manifest_bytes,
        )

        # 11. Create Manifest Record
        await self._manifest_repo.create(
            SnapshotManifestEntity(
                id=generate_ulid(),
                snapshot_id=snapshot.id,
                dataset_version_id=snapshot.dataset_version_id,
                ontology_version_id=snapshot.ontology_version_id,
                asset_count=total_assets,
                annotation_count=total_annotations,
                split_distribution=split_dist,
                class_distribution=class_dist_dict,
                aggregate_checksum=aggregate_checksum,
                storage_uri=artifacts.manifest_uri,
                created_at=snapshot.created_at,
            )
        )

    async def _rollback_and_cleanup(
        self, snapshot_id: str, artifacts: _RunArtifacts
    ) -> None:
        """Undo the run: discard its DB writes and delete its stored objects."""
        try:
            await self._uow.rollback()
        except Exception as exc:
            logger.error("Snapshot {}: rollback failed: {}", snapshot_id, exc)

        if artifacts.manifest_uri:
            try:
                deleted = await self._storage_gateway.delete_object(artifacts.manifest_uri)
            except Exception as exc:
                deleted = False
                logger.error(
                    "Snapshot {}: deleting manifest {} raised: {}",
                    snapshot_id,
                    artifacts.manifest_uri,
                    exc,
                )
            if not deleted:
                logger.error(
                    "Snapshot {}: manifest {} was not deleted; remove it manually.",
                    snapshot_id,
                    artifacts.manifest_uri,
                )

    async def _fail(
        self,
        snapshot_id: str,
        artifacts: _RunArtifacts,
        error_code: str,
        error_message: str,
    ) -> SnapshotEntity:
        await self._rollback_and_cleanup(snapshot_id, artifacts)
        clear_snapshot_cancellation(snapshot_id)

        # Re-read after the rollback: the status may already have been set to
        # FAILED by CancelSnapshotUseCase, which must not be overwritten.
        snapshot = await self._snapshot_repo.get_by_id(snapshot_id)
        if snapshot is None:
            raise ValueError(f"Snapshot '{snapshot_id}' disappeared during creation.")
        if snapshot.status in (SnapshotStatus.CREATING, SnapshotStatus.READY):
            snapshot.mark_failed(error_code=error_code, error_message=error_message)
            snapshot = await self._snapshot_repo.update(snapshot)
        await self._uow.commit()

        logger.warning("Snapshot {} failed: {} - {}", snapshot_id, error_code, error_message)
        return snapshot
