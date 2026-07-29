from collections.abc import Sequence

from database.models import (
    AssetModel,
    DatasetModel,
    DatasetVersionAssetModel,
    DatasetVersionModel,
)
from domain.entities import (
    AssetEntity,
    DatasetEntity,
    DatasetVersionAssetEntity,
    DatasetVersionEntity,
)
from domain.interfaces import IDatasetRepository
from shared.utils.id_generator import generate_ulid
from sqlalchemy import delete, inspect, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


def _map_asset_to_entity(model: AssetModel) -> AssetEntity:
    return AssetEntity(
        id=model.id,
        project_id=model.project_id,
        filename=model.filename,
        uri=model.uri,
        mime_type=model.mime_type,
        file_size=model.file_size,
        sha256=model.sha256,
        metadata=model.asset_metadata,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def _map_version_asset_to_entity(
    model: DatasetVersionAssetModel,
) -> DatasetVersionAssetEntity:
    unloaded = inspect(model).unloaded
    asset_entity = (
        _map_asset_to_entity(model.asset)
        if "asset" not in unloaded and model.asset
        else None
    )
    return DatasetVersionAssetEntity(
        id=model.id,
        dataset_version_id=model.dataset_version_id,
        asset_id=model.asset_id,
        sort_order=model.sort_order,
        created_at=model.created_at,
        updated_at=model.updated_at,
        asset=asset_entity,
    )


def _map_version_to_entity(model: DatasetVersionModel) -> DatasetVersionEntity:
    unloaded = inspect(model).unloaded
    assets: list[AssetEntity] = []
    if "version_assets" not in unloaded and model.version_assets:
        for va in model.version_assets:
            if va.asset:
                assets.append(_map_asset_to_entity(va.asset))

    return DatasetVersionEntity(
        id=model.id,
        dataset_id=model.dataset_id,
        version=model.version,
        status=model.status,  # type: ignore
        asset_count=model.asset_count,
        created_at=model.created_at,
        updated_at=model.updated_at,
        published_at=model.published_at,
        assets=assets,
    )


def _map_dataset_to_entity(model: DatasetModel) -> DatasetEntity:
    unloaded = inspect(model).unloaded
    vers = (
        [_map_version_to_entity(v) for v in model.versions]
        if "versions" not in unloaded and model.versions
        else []
    )
    return DatasetEntity(
        id=model.id,
        project_id=model.project_id,
        name=model.name,
        description=model.description,
        status=model.status,  # type: ignore
        created_at=model.created_at,
        updated_at=model.updated_at,
        versions=vers,
    )


class DatasetRepository(IDatasetRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def save_dataset(self, dataset: DatasetEntity) -> DatasetEntity:
        stmt = select(DatasetModel).where(DatasetModel.id == dataset.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.name = dataset.name
            existing.description = dataset.description
            existing.status = dataset.status
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_dataset_to_entity(existing)

        model = DatasetModel(
            id=dataset.id,
            project_id=dataset.project_id,
            name=dataset.name,
            description=dataset.description,
            status=dataset.status,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_dataset_to_entity(model)

    async def get_dataset_by_id(self, dataset_id: str) -> DatasetEntity | None:
        stmt = (
            select(DatasetModel)
            .options(
                selectinload(DatasetModel.versions)
                .selectinload(DatasetVersionModel.version_assets)
                .selectinload(DatasetVersionAssetModel.asset)
            )
            .where(DatasetModel.id == dataset_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_dataset_to_entity(model) if model else None

    async def list_datasets_by_project(
        self, project_id: str
    ) -> Sequence[DatasetEntity]:
        stmt = (
            select(DatasetModel)
            .options(selectinload(DatasetModel.versions))
            .where(DatasetModel.project_id == project_id)
            .order_by(DatasetModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_map_dataset_to_entity(m) for m in models]

    async def save_version(self, version: DatasetVersionEntity) -> DatasetVersionEntity:
        stmt = select(DatasetVersionModel).where(DatasetVersionModel.id == version.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.status = version.status
            existing.asset_count = version.asset_count
            existing.published_at = version.published_at
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_version_to_entity(existing)

        model = DatasetVersionModel(
            id=version.id,
            dataset_id=version.dataset_id,
            version=version.version,
            status=version.status,
            asset_count=version.asset_count,
            published_at=version.published_at,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_version_to_entity(model)

    async def get_version_by_id(self, version_id: str) -> DatasetVersionEntity | None:
        stmt = (
            select(DatasetVersionModel)
            .options(
                selectinload(DatasetVersionModel.version_assets).selectinload(
                    DatasetVersionAssetModel.asset
                )
            )
            .where(DatasetVersionModel.id == version_id)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_version_to_entity(model) if model else None

    async def list_versions_by_dataset(
        self, dataset_id: str
    ) -> Sequence[DatasetVersionEntity]:
        stmt = (
            select(DatasetVersionModel)
            .where(DatasetVersionModel.dataset_id == dataset_id)
            .order_by(DatasetVersionModel.created_at.desc())
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_map_version_to_entity(m) for m in models]

    async def find_asset_by_sha256(
        self, project_id: str, sha256: str
    ) -> AssetEntity | None:
        stmt = select(AssetModel).where(
            AssetModel.project_id == project_id,
            AssetModel.sha256 == sha256,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_asset_to_entity(model) if model else None

    async def save_asset(self, asset: AssetEntity) -> AssetEntity:
        stmt = select(AssetModel).where(AssetModel.id == asset.id)
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()
        if existing:
            existing.filename = asset.filename
            existing.uri = asset.uri
            existing.mime_type = asset.mime_type
            existing.file_size = asset.file_size
            existing.asset_metadata = asset.metadata
            await self.session.flush()
            await self.session.refresh(existing)
            return _map_asset_to_entity(existing)

        model = AssetModel(
            id=asset.id,
            project_id=asset.project_id,
            filename=asset.filename,
            uri=asset.uri,
            mime_type=asset.mime_type,
            file_size=asset.file_size,
            sha256=asset.sha256,
            asset_metadata=asset.metadata,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return _map_asset_to_entity(model)

    async def get_asset_by_id(self, asset_id: str) -> AssetEntity | None:
        stmt = select(AssetModel).where(AssetModel.id == asset_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_asset_to_entity(model) if model else None

    async def add_asset_to_version(
        self, version_id: str, asset_id: str, sort_order: int = 0
    ) -> DatasetVersionAssetEntity:
        link_stmt = select(DatasetVersionAssetModel).where(
            DatasetVersionAssetModel.dataset_version_id == version_id,
            DatasetVersionAssetModel.asset_id == asset_id,
        )
        r = await self.session.execute(link_stmt)
        existing = r.scalar_one_or_none()
        if existing:
            return _map_version_asset_to_entity(existing)

        link_model = DatasetVersionAssetModel(
            id=generate_ulid(),
            dataset_version_id=version_id,
            asset_id=asset_id,
            sort_order=sort_order,
        )
        self.session.add(link_model)
        await self.session.flush()

        # Update asset_count on DatasetVersionModel
        ver_stmt = select(DatasetVersionModel).where(
            DatasetVersionModel.id == version_id
        )
        v_res = await self.session.execute(ver_stmt)
        ver = v_res.scalar_one_or_none()
        if ver:
            ver.asset_count += 1
            await self.session.flush()

        return _map_version_asset_to_entity(link_model)

    async def remove_asset_from_version(self, version_id: str, asset_id: str) -> bool:
        del_stmt = delete(DatasetVersionAssetModel).where(
            DatasetVersionAssetModel.dataset_version_id == version_id,
            DatasetVersionAssetModel.asset_id == asset_id,
        )
        res = await self.session.execute(del_stmt)
        deleted = int(getattr(res, "rowcount", 0) or 0) > 0

        if deleted:
            ver_stmt = select(DatasetVersionModel).where(
                DatasetVersionModel.id == version_id
            )
            v_res = await self.session.execute(ver_stmt)
            ver = v_res.scalar_one_or_none()
            if ver and ver.asset_count > 0:
                ver.asset_count -= 1
                await self.session.flush()

        return deleted

    async def list_assets_by_version(
        self, version_id: str, limit: int = 100, offset: int = 0
    ) -> Sequence[AssetEntity]:
        stmt = (
            select(AssetModel)
            .join(
                DatasetVersionAssetModel,
                DatasetVersionAssetModel.asset_id == AssetModel.id,
            )
            .where(DatasetVersionAssetModel.dataset_version_id == version_id)
            .order_by(
                DatasetVersionAssetModel.sort_order.asc(), AssetModel.created_at.desc()
            )
            .limit(limit)
            .offset(offset)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [_map_asset_to_entity(m) for m in models]

    async def get_version_asset_link(
        self, version_id: str, asset_id: str
    ) -> DatasetVersionAssetEntity | None:
        stmt = select(DatasetVersionAssetModel).where(
            DatasetVersionAssetModel.dataset_version_id == version_id,
            DatasetVersionAssetModel.asset_id == asset_id,
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return _map_version_asset_to_entity(model) if model else None
