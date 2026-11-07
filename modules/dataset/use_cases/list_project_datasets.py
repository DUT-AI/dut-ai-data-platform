from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import DatasetResponseDTO


class ListProjectDatasetsUseCase:
    """Lists all datasets belonging to a project."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(self, project_id: str) -> list[DatasetResponseDTO]:
        datasets = await self.repo.list_datasets_by_project(project_id)
        return [DatasetResponseDTO.model_validate(d) for d in datasets]

