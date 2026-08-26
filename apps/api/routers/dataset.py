from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import require_project_role
from modules.dataset.dtos.dataset_dtos import (
    AssetDownloadUrlResponseDTO,
    AssetResponseDTO,
    BatchUploadResultDTO,
    DatasetCreateDTO,
    DatasetResponseDTO,
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
)
from modules.dataset.use_cases import (
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

router = APIRouter(tags=["Datasets"])


@router.post(
    "/api/v1/projects/{project_id}/datasets",
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
    "/api/v1/projects/{project_id}/datasets",
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
    "/api/v1/datasets/{dataset_id}",
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


@router.post(
    "/api/v1/datasets/{dataset_id}/versions",
    response_model=DatasetVersionResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new dataset version",
)
@inject
async def create_dataset_version(
    dataset_id: str,
    payload: DatasetVersionCreateDTO,
    current_user: CurrentUser,
    use_case: FromDishka[CreateDatasetVersionUseCase],
):
    return await use_case.execute(dataset_id, payload)


@router.get(
    "/api/v1/dataset-versions/{version_id}",
    response_model=DatasetVersionResponseDTO,
    summary="Get dataset version details",
)
@inject
async def get_dataset_version_detail(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetDatasetVersionDetailUseCase],
):
    return await use_case.execute(version_id)


@router.get(
    "/api/v1/dataset-versions/{version_id}/assets",
    response_model=list[AssetResponseDTO],
    summary="List all assets belonging to a dataset version",
)
@inject
async def list_version_assets(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListVersionAssetsUseCase],
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    return await use_case.execute(version_id, limit=limit, offset=offset)


@router.post(
    "/api/v1/dataset-versions/{version_id}/assets",
    response_model=BatchUploadResultDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Batch upload assets to a draft dataset version",
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

    return await use_case.execute(version_id, file_tuples)


@router.delete(
    "/api/v1/dataset-versions/{version_id}/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an asset link from a draft dataset version",
)
@inject
async def remove_version_asset(
    version_id: str,
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[RemoveVersionAssetUseCase],
):
    await use_case.execute(version_id, asset_id)


@router.put(
    "/api/v1/dataset-versions/{version_id}/publish",
    response_model=DatasetVersionResponseDTO,
    summary="Publish a draft dataset version (locking assets)",
)
@inject
async def publish_dataset_version(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[PublishDatasetVersionUseCase],
):
    return await use_case.execute(version_id)


@router.get(
    "/api/v1/assets/{asset_id}",
    response_model=AssetResponseDTO,
    summary="Get single asset metadata",
)
@inject
async def get_asset_detail(
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAssetDetailUseCase],
):
    return await use_case.execute(asset_id)


@router.get(
    "/api/v1/assets/{asset_id}/download",
    response_model=AssetDownloadUrlResponseDTO,
    summary="Get presigned download URL for an asset",
)
@inject
async def get_asset_download_url(
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[GetAssetDownloadUrlUseCase],
    expires_in_seconds: int = Query(3600, ge=60, le=86400),
):
    return await use_case.execute(asset_id, expires_in_seconds=expires_in_seconds)
