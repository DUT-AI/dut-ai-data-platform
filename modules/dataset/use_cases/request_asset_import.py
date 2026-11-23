import hashlib

from core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from core.queue.interface import IJobQueue
from core.utils.id_generator import generate_ulid
from modules.dataset.domain.import_job import ImportItem, ImportJob, ImportJobSource
from modules.dataset.domain.interfaces import IAssetImportJobStore, IDatasetRepository
from modules.dataset.domain.policies import DatasetVersionPolicy
from modules.dataset.services.asset_ingestion import (
    AssetObjectStore,
    PreparedAssetFile,
    StoredObject,
)

VALIDATE_ASSET_IMPORT_TASK = "validate_asset_import"


class RequestAssetImportUseCase:
    """Accept an import: cheap synchronous checks, then queue it for a worker.

    Files are not inspected here; validation workers download and check them
    (see ``ProcessAssetImportUseCase``). Nothing is written to the database.
    """

    def __init__(
        self,
        repo: IDatasetRepository,
        job_store: IAssetImportJobStore,
        queue: IJobQueue,
        max_items: int,
    ) -> None:
        self.repo = repo
        self.job_store = job_store
        self.queue = queue
        self.max_items = max_items

    async def execute(
        self,
        version_id: str,
        items: list[ImportItem],
        created_by: int | None,
        source: ImportJobSource = "presigned",
    ) -> ImportJob:
        project_id = await self.project_of_draft_version(version_id)

        if not items:
            raise BadRequestException("An import needs at least one file.")
        if len(items) > self.max_items:
            raise BadRequestException(
                f"An import accepts at most {self.max_items} files; got {len(items)}."
            )
        for item in items:
            self._ensure_key_belongs_to_asset(project_id, item)

        job = ImportJob(
            project_id=project_id,
            version_id=version_id,
            items=items,
            source=source,
            created_by=created_by,
        )
        await self.job_store.save(job)
        await self.queue.enqueue(VALIDATE_ASSET_IMPORT_TASK, job.id, job_id=job.id)
        return job

    async def project_of_draft_version(self, version_id: str) -> str:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")
        DatasetVersionPolicy.ensure_accepts_asset_uploads(version)
        dataset = await self.repo.get_dataset_by_id(version.dataset_id)
        if not dataset:
            raise NotFoundException(f"Parent dataset '{version.dataset_id}' not found.")
        return dataset.project_id

    @staticmethod
    def _ensure_key_belongs_to_asset(project_id: str, item: ImportItem) -> None:
        # The key comes from the client: it must be the one issued by
        # prepare-upload for this project and asset, otherwise a caller could
        # register (and then download) an object owned by another project.
        clean_key = item.storage_key.lstrip("/")
        expected_prefix = f"project-{project_id}/assets/{item.asset_id}/"
        if not clean_key.startswith(expected_prefix) or ".." in clean_key.split("/"):
            raise ForbiddenException(
                f"Storage key '{item.storage_key}' does not belong to asset "
                f"'{item.asset_id}' of this project."
            )


class StageDirectUploadUseCase:
    """Legacy multipart upload: store the raw files, then queue the same import.

    Uploaded objects are deleted again if anything fails before the job is
    queued, so a rejected request leaves nothing behind.
    """

    def __init__(
        self, object_store: AssetObjectStore, request_import: RequestAssetImportUseCase
    ) -> None:
        self.object_store = object_store
        self.request_import = request_import

    async def execute(
        self,
        version_id: str,
        files: list[tuple[str, bytes, str | None]],
        created_by: int | None,
    ) -> ImportJob:
        project_id = await self.request_import.project_of_draft_version(version_id)
        files = [(name, content, mime) for name, content, mime in files if name and content]
        if not files:
            raise BadRequestException("An import needs at least one non-empty file.")
        if len(files) > self.request_import.max_items:
            raise BadRequestException(
                f"An import accepts at most {self.request_import.max_items} files; "
                f"got {len(files)}."
            )

        staged: list[StoredObject] = []
        items: list[ImportItem] = []
        try:
            for filename, content, mime_type in files:
                asset_id = generate_ulid()
                sha256 = hashlib.sha256(content).hexdigest()
                obj = await self.object_store.put(
                    project_id,
                    asset_id,
                    PreparedAssetFile(
                        filename=filename,
                        content=content,
                        mime_type=mime_type or "application/octet-stream",
                        sha256=sha256,
                    ),
                )
                staged.append(obj)
                items.append(
                    ImportItem(
                        asset_id=asset_id,
                        filename=filename,
                        storage_key=obj.key,
                        sha256=sha256,
                        file_size=len(content),
                        mime_type=mime_type,
                    )
                )
            return await self.request_import.execute(
                version_id, items, created_by, source="direct"
            )
        except BaseException:
            await self.object_store.delete_many(staged)
            raise
