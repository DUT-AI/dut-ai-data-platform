from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.dataset.dtos.dataset_dtos import (
    DatasetCreateDTO,
    DatasetResponseDTO,
    DatasetUpdateDTO,
)
from modules.dataset.use_cases import (
    ArchiveDatasetUseCase,
    CreateDatasetUseCase,
    GetDatasetDetailUseCase,
    ListProjectDatasetsUseCase,
    UpdateDatasetUseCase,
)

router = APIRouter(tags=["Datasets"])


@router.post(
    "/projects/{project_id}/datasets",
    response_model=DatasetResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new dataset for a project",
)
@inject
async def create_dataset(
    project_id: str,
    payload: DatasetCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateDatasetUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    return await use_case.execute(project_id, payload)


@router.get(
    "/projects/{project_id}/datasets",
    response_model=list[DatasetResponseDTO],
    summary="List all datasets of a project",
)
@inject
async def list_project_datasets(
    project_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListProjectDatasetsUseCase],
    role: str = Depends(
        require_project_role("owner", "admin", "annotator", "reviewer")
    ),
):
    return await use_case.execute(project_id)


@router.get(
    "/datasets/{dataset_id}",
    response_model=DatasetResponseDTO,
    summary="Get dataset details",
)
@inject
async def get_dataset_detail(
    dataset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetDatasetDetailUseCase],
):
    return await use_case.execute(dataset_id)


@router.patch(
    "/datasets/{dataset_id}",
    response_model=DatasetResponseDTO,
    summary="Update dataset metadata (name, description, tags)",
)
@inject
async def update_dataset(
    dataset_id: str,
    payload: DatasetUpdateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[UpdateDatasetUseCase],
):
    return await use_case.execute(dataset_id, payload)


@router.put(
    "/datasets/{dataset_id}/archive",
    response_model=DatasetResponseDTO,
    summary="Archive a dataset (prevents creating new versions)",
)
@inject
async def archive_dataset(
    dataset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ArchiveDatasetUseCase],
):
    return await use_case.execute(dataset_id)
