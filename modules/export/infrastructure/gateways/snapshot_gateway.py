import asyncio
import io
from collections.abc import AsyncIterator
from typing import BinaryIO

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.config import s3_settings
from core.storage.interface import IStorageProvider
from modules.annotation.models.annotation import AnnotationRevisionModel
from modules.dataset.models.dataset import AssetModel
from modules.export.domain.exceptions import (
    SnapshotNotFoundError,
    SnapshotNotReadyError,
)
from modules.export.domain.interfaces import (
    ISnapshotGateway,
    OntologyCategoryInfo,
    OntologyOutputInfo,
    SnapshotAnnotationInfo,
    SnapshotAssetInfo,
    SnapshotExportContext,
    SnapshotItemExportData,
)
from modules.ontology.models.ontology import (
    CategoryModel,
    OntologyOutputModel,
    OntologyVersionModel,
    OntologyVersionOutputCategoryModel,
    OntologyVersionOutputModel,
)
from modules.snapshot.domain.value_objects import SnapshotStatus
from modules.snapshot.infrastructure.persistence.models import (
    SnapshotItemModel,
    SnapshotModel,
)


class SnapshotGateway(ISnapshotGateway):
    def __init__(
        self,
        session: AsyncSession,
        storage_provider: IStorageProvider,
    ) -> None:
        self._session = session
        self._storage = storage_provider
        self._bucket = s3_settings.default_bucket

    async def get_export_context(self, snapshot_id: str) -> SnapshotExportContext:
        stmt = select(SnapshotModel).where(SnapshotModel.id == snapshot_id)
        result = await self._session.execute(stmt)
        snapshot = result.scalar_one_or_none()

        if not snapshot:
            raise SnapshotNotFoundError(f"Snapshot with ID '{snapshot_id}' not found.")

        if snapshot.status != SnapshotStatus.READY.value:
            raise SnapshotNotReadyError(
                f"Snapshot '{snapshot_id}' is not in READY state (current: {snapshot.status})."
            )

        # Count total items
        count_stmt = (
            select(func.count())
            .select_from(SnapshotItemModel)
            .where(SnapshotItemModel.snapshot_id == snapshot_id)
        )
        total_items = (await self._session.execute(count_stmt)).scalar_one() or 0

        # Load ontology outputs and categories
        ont_version_id = snapshot.ontology_version_id
        outputs_stmt = (
            select(OntologyVersionOutputModel)
            .options(
                selectinload(OntologyVersionOutputModel.output).selectinload(
                    OntologyOutputModel.definition
                ),
                selectinload(OntologyVersionOutputModel.category_links).selectinload(
                    OntologyVersionOutputCategoryModel.category
                ),
            )
            .where(OntologyVersionOutputModel.ontology_version_id == ont_version_id)
            .order_by(OntologyVersionOutputModel.sort_order.asc())
        )
        outputs_res = await self._session.execute(outputs_stmt)
        version_outputs = outputs_res.scalars().all()

        outputs: list[OntologyOutputInfo] = []
        all_categories_map: dict[str, OntologyCategoryInfo] = {}

        for vo in version_outputs:
            out_model = vo.output
            def_code = (
                out_model.definition.code
                if out_model and out_model.definition
                else "unknown"
            )
            cats: list[OntologyCategoryInfo] = []
            for cl in vo.category_links:
                cat_model = cl.category
                if cat_model:
                    c_info = OntologyCategoryInfo(
                        id=cat_model.id,
                        key=cat_model.key,
                        name=cat_model.name,
                        color=cat_model.color,
                    )
                    cats.append(c_info)
                    all_categories_map[c_info.id] = c_info

            outputs.append(
                OntologyOutputInfo(
                    id=vo.ontology_output_id,
                    name=out_model.name if out_model else "",
                    definition_code=def_code,
                    categories=cats,
                )
            )

        # Fallback if no category links on version outputs, load all categories for ontology
        if not all_categories_map:
            ont_stmt = select(OntologyVersionModel.ontology_id).where(
                OntologyVersionModel.id == ont_version_id
            )
            ont_id = (await self._session.execute(ont_stmt)).scalar_one_or_none()
            if ont_id:
                cats_stmt = (
                    select(CategoryModel)
                    .where(CategoryModel.ontology_id == ont_id)
                    .order_by(CategoryModel.name.asc())
                )
                cats_res = await self._session.execute(cats_stmt)
                for c in cats_res.scalars().all():
                    c_info = OntologyCategoryInfo(
                        id=c.id, key=c.key, name=c.name, color=c.color
                    )
                    all_categories_map[c.id] = c_info

        return SnapshotExportContext(
            snapshot_id=snapshot.id,
            project_id=snapshot.project_id,
            version_name=snapshot.version_name,
            dataset_version_id=snapshot.dataset_version_id,
            ontology_version_id=snapshot.ontology_version_id,
            outputs=outputs,
            categories=list(all_categories_map.values()),
            total_items=total_items,
        )

    async def stream_snapshot_items(
        self,
        snapshot_id: str,
        annotated_only: bool = False,
    ) -> AsyncIterator[SnapshotItemExportData]:
        batch_size = 500
        offset = 0

        while True:
            stmt = (
                select(SnapshotItemModel)
                .where(SnapshotItemModel.snapshot_id == snapshot_id)
                .order_by(
                    SnapshotItemModel.sort_order.asc(), SnapshotItemModel.id.asc()
                )
                .limit(batch_size)
                .offset(offset)
            )
            if annotated_only:
                stmt = stmt.where(SnapshotItemModel.annotation_revision_id.is_not(None))

            result = await self._session.execute(stmt)
            batch = result.scalars().all()
            if not batch:
                break

            # Collect IDs for batch resolution
            asset_ids = [item.asset_id for item in batch]
            rev_ids = [
                item.annotation_revision_id
                for item in batch
                if item.annotation_revision_id
            ]

            # Fetch assets
            asset_stmt = select(AssetModel).where(AssetModel.id.in_(asset_ids))
            asset_res = await self._session.execute(asset_stmt)
            asset_map = {a.id: a for a in asset_res.scalars().all()}

            # Fetch annotation revisions
            rev_map: dict[str, AnnotationRevisionModel] = {}
            if rev_ids:
                rev_stmt = select(AnnotationRevisionModel).where(
                    AnnotationRevisionModel.id.in_(rev_ids)
                )
                rev_res = await self._session.execute(rev_stmt)
                rev_map = {r.id: r for r in rev_res.scalars().all()}

            for item in batch:
                asset_model = asset_map.get(item.asset_id)
                asset_info = SnapshotAssetInfo(
                    asset_id=item.asset_id,
                    uri=asset_model.uri if asset_model else "",
                    sha256=asset_model.sha256 if asset_model else "",
                    data_format=asset_model.data_format if (asset_model and asset_model.data_format) else "image",
                    file_size_bytes=getattr(asset_model, "file_size_bytes", 0) or 0,
                )

                ann_info: SnapshotAnnotationInfo | None = None
                if (
                    item.annotation_revision_id
                    and item.annotation_revision_id in rev_map
                ):
                    rev_model = rev_map[item.annotation_revision_id]
                    ann_info = SnapshotAnnotationInfo(
                        revision_id=rev_model.id,
                        results=rev_model.results or [],
                        category_ids=rev_model.category_ids or [],
                        source=rev_model.source or "human",
                    )

                yield SnapshotItemExportData(
                    asset_id=item.asset_id,
                    annotation_revision_id=item.annotation_revision_id,
                    split=item.split,
                    item_checksum=item.item_checksum,
                    asset=asset_info,
                    annotation=ann_info,
                )

            offset += len(batch)
            if len(batch) < batch_size:
                break

    async def get_asset_stream(self, uri: str) -> BinaryIO:
        # Resolve key from uri
        clean_uri = uri
        prefix = f"s3://{self._bucket}/"
        if clean_uri.startswith(prefix):
            key = clean_uri[len(prefix) :]
        elif clean_uri.startswith("/"):
            parts = clean_uri.lstrip("/").split("/", 1)
            key = parts[1] if len(parts) > 1 else parts[0]
        else:
            key = clean_uri

        # If storage adapter provides client, read bytes
        if hasattr(self._storage, "client"):
            loop = asyncio.get_running_loop()
            res = await loop.run_in_executor(
                None,
                lambda: self._storage.client.get_object(  # type: ignore
                    Bucket=self._bucket, Key=key
                ),
            )
            body = res["Body"].read()
            return io.BytesIO(body)

        return io.BytesIO(b"")
