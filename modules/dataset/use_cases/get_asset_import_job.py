from core.exceptions import NotFoundException
from modules.dataset.domain.import_job import ImportJob
from modules.dataset.domain.interfaces import IAssetImportJobStore, IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    AssetImportErrorDTO,
    AssetImportJobDTO,
    AssetResponseDTO,
)


class GetAssetImportJobUseCase:
    """Read an import job. Authorization is the caller's job (needs ``project_id``)."""

    def __init__(self, job_store: IAssetImportJobStore, repo: IDatasetRepository) -> None:
        self.job_store = job_store
        self.repo = repo

    async def load(self, job_id: str) -> ImportJob:
        job = await self.job_store.get(job_id)
        if job is None:
            raise NotFoundException(f"Asset import job '{job_id}' not found or expired.")
        return job

    async def describe(self, job: ImportJob) -> AssetImportJobDTO:
        assets = (
            await self.repo.get_assets_by_ids(job.imported_asset_ids)
            if job.status == "succeeded"
            else []
        )
        return AssetImportJobDTO(
            job_id=job.id,
            project_id=job.project_id,
            version_id=job.version_id,
            status=job.status,
            source=job.source,
            attempt=job.attempt,
            total_items=len(job.items),
            new_assets_count=job.new_assets_count,
            reused_assets_count=job.reused_assets_count,
            imported_assets=[AssetResponseDTO.model_validate(a) for a in assets],
            errors=[AssetImportErrorDTO(**e.__dict__) for e in job.errors],
            created_at=job.created_at,
            finished_at=job.finished_at,
        )
