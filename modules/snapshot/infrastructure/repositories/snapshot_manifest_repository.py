from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.snapshot.domain.entities import SnapshotManifestEntity
from modules.snapshot.domain.interfaces import SnapshotManifestRepository
from modules.snapshot.infrastructure.persistence.models import (
    SnapshotManifestModel,
)


def _to_entity(model: SnapshotManifestModel) -> SnapshotManifestEntity:
    return SnapshotManifestEntity(
        id=model.id,
        snapshot_id=model.snapshot_id,
        dataset_version_id=model.dataset_version_id,
        ontology_version_id=model.ontology_version_id,
        asset_count=model.asset_count,
        annotation_count=model.annotation_count,
        split_distribution=dict(model.split_distribution),
        class_distribution=dict(model.class_distribution),
        aggregate_checksum=model.aggregate_checksum,
        storage_uri=model.storage_uri,
        created_at=model.created_at,
    )


class SqlSnapshotManifestRepository(SnapshotManifestRepository):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, manifest: SnapshotManifestEntity) -> SnapshotManifestEntity:
        model = SnapshotManifestModel(
            id=manifest.id,
            snapshot_id=manifest.snapshot_id,
            dataset_version_id=manifest.dataset_version_id,
            ontology_version_id=manifest.ontology_version_id,
            asset_count=manifest.asset_count,
            annotation_count=manifest.annotation_count,
            split_distribution=manifest.split_distribution,
            class_distribution=manifest.class_distribution,
            aggregate_checksum=manifest.aggregate_checksum,
            storage_uri=manifest.storage_uri,
            created_at=manifest.created_at,
        )
        self._session.add(model)
        await self._session.flush()
        return _to_entity(model)

    async def get_by_snapshot_id(
        self, snapshot_id: str
    ) -> SnapshotManifestEntity | None:
        stmt = select(SnapshotManifestModel).where(
            SnapshotManifestModel.snapshot_id == snapshot_id
        )
        result = await self._session.execute(stmt)
        model = result.scalar_one_or_none()
        if not model:
            return None
        return _to_entity(model)
