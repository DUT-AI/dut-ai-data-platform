from collections import Counter
from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.snapshot.domain.interfaces import SnapshotDiffService
from modules.snapshot.infrastructure.persistence.models import (
    SnapshotItemModel,
    SnapshotManifestModel,
)


class SqlSnapshotDiffService(SnapshotDiffService):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def calculate_diff_summary(
        self,
        base_snapshot_id: str,
        target_snapshot_id: str,
    ) -> dict[str, Any]:
        # 1. Fetch manifests for class distribution comparison
        base_m_stmt = select(SnapshotManifestModel).where(
            SnapshotManifestModel.snapshot_id == base_snapshot_id
        )
        target_m_stmt = select(SnapshotManifestModel).where(
            SnapshotManifestModel.snapshot_id == target_snapshot_id
        )
        base_m_res = await self._session.execute(base_m_stmt)
        target_m_res = await self._session.execute(target_m_stmt)
        base_m = base_m_res.scalar_one_or_none()
        target_m = target_m_res.scalar_one_or_none()

        class_deltas: Counter[str] = Counter()
        if base_m and target_m:
            base_classes: Counter[str] = Counter()
            for split_dist in base_m.class_distribution.values():
                base_classes.update(split_dist)

            target_classes: Counter[str] = Counter()
            for split_dist in target_m.class_distribution.values():
                target_classes.update(split_dist)

            all_labels = set(base_classes.keys()) | set(target_classes.keys())
            for lbl in all_labels:
                class_deltas[lbl] = target_classes.get(lbl, 0) - base_classes.get(
                    lbl, 0
                )

        # 2. Query items to calculate diff counts
        base_items_stmt = select(
            SnapshotItemModel.asset_id,
            SnapshotItemModel.annotation_revision_id,
            SnapshotItemModel.split,
        ).where(SnapshotItemModel.snapshot_id == base_snapshot_id)

        target_items_stmt = select(
            SnapshotItemModel.asset_id,
            SnapshotItemModel.annotation_revision_id,
            SnapshotItemModel.split,
        ).where(SnapshotItemModel.snapshot_id == target_snapshot_id)

        base_rows = (await self._session.execute(base_items_stmt)).all()
        target_rows = (await self._session.execute(target_items_stmt)).all()

        base_dict = {row.asset_id: row for row in base_rows}
        target_dict = {row.asset_id: row for row in target_rows}

        base_assets = set(base_dict.keys())
        target_assets = set(target_dict.keys())

        added_assets = target_assets - base_assets
        removed_assets = base_assets - target_assets
        common_assets = base_assets & target_assets

        modified_count = 0
        split_movement_count = 0

        for aid in common_assets:
            b_item = base_dict[aid]
            t_item = target_dict[aid]

            if b_item.annotation_revision_id != t_item.annotation_revision_id:
                modified_count += 1
            if b_item.split != t_item.split:
                split_movement_count += 1

        return {
            "base_snapshot_id": base_snapshot_id,
            "target_snapshot_id": target_snapshot_id,
            "added_asset_count": len(added_assets),
            "removed_asset_count": len(removed_assets),
            "modified_annotation_count": modified_count,
            "split_movement_count": split_movement_count,
            "class_distribution_deltas": dict(class_deltas),
        }

    async def list_diff_items(
        self,
        base_snapshot_id: str,
        target_snapshot_id: str,
        change_type: str,
        cursor: str | None = None,
        limit: int = 100,
    ) -> tuple[Sequence[dict[str, Any]], str | None]:
        # Fetch items from base and target
        base_items_stmt = select(
            SnapshotItemModel.asset_id,
            SnapshotItemModel.annotation_revision_id,
            SnapshotItemModel.split,
        ).where(SnapshotItemModel.snapshot_id == base_snapshot_id)

        target_items_stmt = select(
            SnapshotItemModel.asset_id,
            SnapshotItemModel.annotation_revision_id,
            SnapshotItemModel.split,
        ).where(SnapshotItemModel.snapshot_id == target_snapshot_id)

        base_rows = (await self._session.execute(base_items_stmt)).all()
        target_rows = (await self._session.execute(target_items_stmt)).all()

        base_dict = {row.asset_id: row for row in base_rows}
        target_dict = {row.asset_id: row for row in target_rows}

        base_assets = set(base_dict.keys())
        target_assets = set(target_dict.keys())
        all_assets = sorted(base_assets | target_assets)

        matched_items: list[dict[str, Any]] = []

        for aid in all_assets:
            b_item = base_dict.get(aid)
            t_item = target_dict.get(aid)

            item_change: str | None = None
            if b_item is None and t_item is not None:
                item_change = "added"
            elif b_item is not None and t_item is None:
                item_change = "removed"
            elif b_item is not None and t_item is not None:
                if b_item.annotation_revision_id != t_item.annotation_revision_id:
                    item_change = "modified"
                elif b_item.split != t_item.split:
                    item_change = "split_changed"

            if item_change == change_type:
                matched_items.append(
                    {
                        "asset_id": aid,
                        "change_type": item_change,
                        "base_revision_id": b_item.annotation_revision_id
                        if b_item
                        else None,
                        "target_revision_id": t_item.annotation_revision_id
                        if t_item
                        else None,
                        "base_split": b_item.split if b_item else None,
                        "target_split": t_item.split if t_item else None,
                    }
                )

        # Apply keyset pagination over asset_id
        if cursor:
            matched_items = [
                item for item in matched_items if item["asset_id"] > cursor
            ]

        next_cursor: str | None = None
        if len(matched_items) > limit:
            next_cursor = matched_items[limit - 1]["asset_id"]
            matched_items = matched_items[:limit]

        return matched_items, next_cursor
