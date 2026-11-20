import hashlib
import json
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.annotation.models.annotation import (
    AnnotationModel,
    AnnotationRevisionModel,
)
from modules.snapshot.domain.interfaces import (
    AnnotationGateway,
    ResolvedAnnotationInfo,
)
from modules.snapshot.domain.value_objects import SelectionPolicy


class SqlAnnotationGateway(AnnotationGateway):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def resolve_revisions(
        self,
        asset_ids: Sequence[str],
        policy: str,
    ) -> dict[str, ResolvedAnnotationInfo | None]:
        if not asset_ids:
            return {}

        stmt = (
            select(
                AnnotationModel.asset_id,
                AnnotationRevisionModel.id,
                AnnotationRevisionModel.revision_number,
                AnnotationRevisionModel.source,
                AnnotationRevisionModel.results,
                AnnotationRevisionModel.category_ids,
            )
            .join(
                AnnotationRevisionModel,
                AnnotationRevisionModel.annotation_id == AnnotationModel.id,
            )
            .where(AnnotationModel.asset_id.in_(asset_ids))
            .order_by(
                AnnotationModel.asset_id.asc(),
                AnnotationRevisionModel.revision_number.desc(),
            )
        )

        result = await self._session.execute(stmt)
        rows = result.all()

        resolved: dict[str, ResolvedAnnotationInfo | None] = {
            aid: None for aid in asset_ids
        }

        for row in rows:
            asset_id = row.asset_id
            if resolved[asset_id] is not None:
                continue

            # If LATEST_APPROVED, prefer human or validated revisions
            if (
                policy == SelectionPolicy.LATEST_APPROVED.value
                and row.source != "human"
                and len(row.results or []) == 0
            ):
                continue

            results = row.results or []
            canonical_json = json.dumps(results, sort_keys=True, separators=(",", ":"))
            rev_sha = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

            labels = [str(c) for c in (row.category_ids or [])]
            if not labels and results:
                for item in results:
                    if isinstance(item, dict) and "label" in item:
                        labels.append(str(item["label"]))

            resolved[asset_id] = ResolvedAnnotationInfo(
                annotation_revision_id=row.id,
                asset_id=asset_id,
                labels=sorted(set(labels)),
                revision_sha256=rev_sha,
            )

        return resolved
