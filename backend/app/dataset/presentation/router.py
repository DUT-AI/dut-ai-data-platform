from app.common.deps import CurrentUser
from app.dataset.application.dtos import (
    AssetDownloadUrlResponseDTO,
    AssetResponseDTO,
    BatchUploadResultDTO,
    DatasetCreateDTO,
    DatasetResponseDTO,
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
)
from app.dataset.application.use_cases import (
    CreateDatasetUseCase,
    CreateDatasetVersionUseCase,
    GetAssetDetailUseCase,
    GetAssetDownloadUrlUseCase,
    GetDatasetDetailUseCase,
    GetDatasetVersionDetailUseCase,
    ListProjectDatasetsUseCase,
    ListVersionAssetsUseCase,
    PublishDatasetVersionUseCase,
    RemoveVersionAssetUseCase,
    UploadVersionAssetsUseCase,
)
from app.project.presentation.deps import require_project_role
from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, File, Query, UploadFile, status

dataset_router = APIRouter(tags=["Datasets"])


@dataset_router.post(
    "/api/v1/projects/{project_id}/datasets",
    response_model=DatasetResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_dataset(
    project_id: str,
    payload: DatasetCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateDatasetUseCase],
    role: str = Depends(require_project_role("owner", "admin")),
):
    dataset = await use_case.execute(project_id, payload)
    return dataset


@dataset_router.get(
    "/api/v1/projects/{project_id}/datasets",
    response_model=list[DatasetResponseDTO],
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
    datasets = await use_case.execute(project_id)
    return datasets


@dataset_router.get(
    "/api/v1/datasets/{dataset_id}",
    response_model=DatasetResponseDTO,
)
@inject
async def get_dataset_detail(
    dataset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetDatasetDetailUseCase],
):
    dataset = await use_case.execute(dataset_id)
    return dataset


@dataset_router.post(
    "/api/v1/datasets/{dataset_id}/versions",
    response_model=DatasetVersionResponseDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def create_dataset_version(
    dataset_id: str,
    payload: DatasetVersionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateDatasetVersionUseCase],
):
    version = await use_case.execute(dataset_id, payload)
    return version


@dataset_router.get(
    "/api/v1/dataset-versions/{version_id}",
    response_model=DatasetVersionResponseDTO,
)
@inject
async def get_dataset_version_detail(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetDatasetVersionDetailUseCase],
):
    version = await use_case.execute(version_id)
    return version


@dataset_router.get(
    "/api/v1/dataset-versions/{version_id}/assets",
    response_model=list[AssetResponseDTO],
)
@inject
async def list_version_assets(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListVersionAssetsUseCase],
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    assets = await use_case.execute(version_id, limit=limit, offset=offset)
    return assets


@dataset_router.post(
    "/api/v1/dataset-versions/{version_id}/assets",
    response_model=BatchUploadResultDTO,
    status_code=status.HTTP_201_CREATED,
)
@inject
async def upload_version_assets(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[UploadVersionAssetsUseCase],
    files: list[UploadFile] = File(...),
):
    file_tuples: list[tuple[str, bytes, str | None]] = []
    for f in files:
        content = await f.read()
        filename = f.filename or "unnamed_file"
        file_tuples.append((filename, content, f.content_type))

    result = await use_case.execute(version_id, file_tuples)
    return result


@dataset_router.delete(
    "/api/v1/dataset-versions/{version_id}/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
@inject
async def remove_version_asset(
    version_id: str,
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[RemoveVersionAssetUseCase],
):
    await use_case.execute(version_id, asset_id)


@dataset_router.put(
    "/api/v1/dataset-versions/{version_id}/publish",
    response_model=DatasetVersionResponseDTO,
)
@inject
async def publish_dataset_version(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[PublishDatasetVersionUseCase],
):
    version = await use_case.execute(version_id)
    return version


@dataset_router.get(
    "/api/v1/assets/{asset_id}",
    response_model=AssetResponseDTO,
)
@inject
async def get_asset_detail(
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAssetDetailUseCase],
):
    asset = await use_case.execute(asset_id)
    return asset


@dataset_router.get(
    "/api/v1/assets/{asset_id}/download",
    response_model=AssetDownloadUrlResponseDTO,
)
@inject
async def get_asset_download_url(
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAssetDownloadUrlUseCase],
    expires_in_seconds: int = Query(3600, ge=60, le=86400),
):
    result = await use_case.execute(asset_id, expires_in_seconds=expires_in_seconds)
    return result
