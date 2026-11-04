from core.events.domain_event import DatasetCreatedEvent
from core.events.outbox import IOutboxRepository
from modules.dataset.domain.entities import DatasetEntity, DatasetVersionEntity
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    DatasetCreateDTO,
    DatasetResponseDTO,
)


class CreateDatasetUseCase:
    """Creates a new dataset aggregate and its initial default v1.0.0 draft version."""

    def __init__(
        self, repo: IDatasetRepository, outbox_repo: IOutboxRepository | None = None
    ) -> None:
        self.repo = repo
        self.outbox_repo = outbox_repo

    async def execute(
        self, project_id: str, payload: DatasetCreateDTO, created_by: int | None = None
    ) -> DatasetResponseDTO:
        dataset = DatasetEntity(
            project_id=project_id,
            name=payload.name,
            description=payload.description,
            tags=payload.tags or [],
            created_by=created_by,
        )
        saved = await self.repo.save_dataset(dataset)

        # Create initial default v1.0.0 draft version
        initial_version = DatasetVersionEntity(
            dataset_id=saved.id,
            version="v1.0.0",
            version_number=1,
            version_label="v1.0.0",
            status="draft",
        )
        saved_ver = await self.repo.save_version(initial_version)
        saved.versions = [saved_ver]

        if self.outbox_repo:
            await self.outbox_repo.save_event(
                DatasetCreatedEvent(
                    dataset_id=saved.id,
                    project_id=saved.project_id,
                    name=saved.name,
                    created_by=str(saved.created_by) if saved.created_by is not None else None,
                )
            )

        return DatasetResponseDTO.model_validate(saved)

