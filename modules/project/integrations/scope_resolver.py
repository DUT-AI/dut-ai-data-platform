from collections.abc import Iterable

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.annotation.models.annotation import (
    AnnotationModel,
    AnnotationRevisionModel,
)
from modules.dataset.models.dataset import (
    AssetModel,
    DatasetModel,
    DatasetVersionModel,
)
from modules.project.domain.access import IProjectScopeResolver, ProjectResourceKind


class SqlProjectScopeResolver(IProjectScopeResolver):
    """Reads only the owning ``project_id`` column; never loads full entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _query(kind: ProjectResourceKind, resource_id: str) -> Select:
        if kind == "dataset":
            return select(DatasetModel.project_id).where(DatasetModel.id == resource_id)
        if kind == "version":
            return (
                select(DatasetModel.project_id)
                .join(DatasetVersionModel, DatasetVersionModel.dataset_id == DatasetModel.id)
                .where(DatasetVersionModel.id == resource_id)
            )
        if kind == "asset":
            return select(AssetModel.project_id).where(AssetModel.id == resource_id)
        if kind == "annotation":
            return select(AnnotationModel.project_id).where(
                AnnotationModel.id == resource_id
            )
        if kind == "revision":
            return (
                select(AnnotationModel.project_id)
                .join(
                    AnnotationRevisionModel,
                    AnnotationRevisionModel.annotation_id == AnnotationModel.id,
                )
                .where(AnnotationRevisionModel.id == resource_id)
            )
        raise ValueError(f"Unsupported project resource kind: {kind}")

    async def project_of(
        self, kind: ProjectResourceKind, resource_id: str
    ) -> str | None:
        result = await self.session.execute(self._query(kind, resource_id))
        return result.scalar_one_or_none()

    async def projects_of_assets(self, asset_ids: Iterable[str]) -> dict[str, str]:
        ids = list(dict.fromkeys(asset_ids))
        if not ids:
            return {}
        result = await self.session.execute(
            select(AssetModel.id, AssetModel.project_id).where(AssetModel.id.in_(ids))
        )
        return {asset_id: project_id for asset_id, project_id in result.all()}
