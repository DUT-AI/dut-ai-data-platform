from core.events.domain_event import DatasetVersionPublishedEvent
from core.events.outbox import IOutboxRepository
from core.exceptions import NotFoundException
from core.utils.datetime_utils import now_utc
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.domain.policies import DatasetVersionPolicy
from modules.dataset.dtos.dataset_dtos import DatasetVersionResponseDTO


class PublishDatasetVersionUseCase:
    """Publishes a draft dataset version, locking composition and generating canonical hash."""

    def __init__(
        self, repo: IDatasetRepository, outbox_repo: IOutboxRepository | None = None
    ) -> None:
        self.repo = repo
        self.outbox_repo = outbox_repo

    async def execute(self, version_id: str) -> DatasetVersionResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset version '{version_id}' not found.")

        # Invariant check: ensure version is mutable (raises InvariantViolationError if already published)
        version.assert_mutable()

        dataset = await self.repo.get_dataset_by_id(version.dataset_id)
        if not dataset:
            raise NotFoundException(f"Parent dataset '{version.dataset_id}' not found.")

        # Enforce domain policy preconditions
        DatasetVersionPolicy.ensure_can_publish(dataset, version)

        # Retrieve all member assets to calculate canonical manifest hash
        assets = await self.repo.get_all_assets_by_version(version_id)

        manifest_hash = DatasetVersionPolicy.compute_manifest_hash(
            version, assets, version.version_config
        )

        version.status = "published"
        version.published_at = now_utc()
        version.manifest_hash = manifest_hash
        version.asset_count = len(assets)

        saved_ver = await self.repo.save_version(version)

        # Update dataset latest published version number
        current_num = dataset.latest_published_version_number or 0
        dataset.latest_published_version_number = max(
            current_num + 1, version.version_number or 1
        )
        await self.repo.save_dataset(dataset)

        if self.outbox_repo:
            await self.outbox_repo.save_event(
                DatasetVersionPublishedEvent(
                    dataset_id=dataset.id,
                    version_id=saved_ver.id,
                    version_number=saved_ver.version_number,
                    manifest_hash=saved_ver.manifest_hash,
                    asset_count=saved_ver.asset_count,
                )
            )

        saved_ver.assets = list(assets)
        return DatasetVersionResponseDTO.model_validate(saved_ver)

