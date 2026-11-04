from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, File, Query, UploadFile, status

from apps.api.deps.auth import CurrentUser
from modules.dataset.dtos.dataset_dtos import (
    AssetResponseDTO,
    BatchUploadResultDTO,
    CursorPageAssetResponseDTO,
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
    FinalizeAssetImportRequestDTO,
    FinalizeAssetImportResponseDTO,
    InheritDatasetVersionRequestDTO,
    InheritDatasetVersionResponseDTO,
    PrepareUploadRequestDTO,
    PrepareUploadResponseDTO,
)
from modules.dataset.use_cases import (
    CreateDatasetVersionUseCase,
    FinalizeAssetImportUseCase,
    GetDatasetVersionDetailUseCase,
    InheritDatasetVersionUseCase,
    ListVersionAssetsCursorUseCase,
    ListVersionAssetsUseCase,
    PrepareAssetUploadUseCase,
    PublishDatasetVersionUseCase,
    RemoveVersionAssetUseCase,
    UploadVersionAssetsUseCase,
)

router = APIRouter(tags=["Dataset Versions"])


@router.post(
    "/datasets/{dataset_id}/versions",
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
    "/dataset-versions/{version_id}",
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


@router.post(
    "/dataset-versions/{version_id}/inherit",
    response_model=InheritDatasetVersionResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Inherit assets from another version in the same dataset",
)
@inject
async def inherit_dataset_version(
    version_id: str,
    payload: InheritDatasetVersionRequestDTO,
    current_user: CurrentUser,
    use_case: FromDishka[InheritDatasetVersionUseCase],
):
    return await use_case.execute(version_id, payload)


@router.get(
    "/dataset-versions/{version_id}/assets",
    response_model=list[AssetResponseDTO],
    summary="List all assets belonging to a dataset version (Offset-based)",
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


@router.get(
    "/dataset-versions/{version_id}/assets/cursor",
    response_model=CursorPageAssetResponseDTO,
    summary="List assets belonging to a dataset version using Cursor Pagination (Spec v1)",
)
@inject
async def list_version_assets_cursor(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[ListVersionAssetsCursorUseCase],
    limit: int = Query(100, ge=1, le=500),
    cursor: str | None = Query(None, description="Last Asset ID for next page"),
):
    return await use_case.execute(version_id, limit=limit, cursor_id=cursor)


@router.post(
    "/dataset-versions/{version_id}/prepare-upload",
    response_model=PrepareUploadResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Get presigned S3 upload URLs for assets (Spec v1)",
)
@inject
async def prepare_asset_upload(
    version_id: str,
    payload: PrepareUploadRequestDTO,
    current_user: CurrentUser,
    use_case: FromDishka[PrepareAssetUploadUseCase],
):
    return await use_case.execute(version_id, payload)


@router.post(
    "/dataset-versions/{version_id}/finalize-import",
    response_model=FinalizeAssetImportResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Finalize asset import after S3 presigned upload (Spec v1)",
)
@inject
async def finalize_asset_import(
    version_id: str,
    payload: FinalizeAssetImportRequestDTO,
    current_user: CurrentUser,
    use_case: FromDishka[FinalizeAssetImportUseCase],
):
    return await use_case.execute(version_id, payload, created_by=current_user.id)


@router.post(
    "/dataset-versions/{version_id}/assets",
    response_model=BatchUploadResultDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Batch upload assets directly (Deprecated - Use prepare-upload & finalize-import)",
    deprecated=True,
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
    "/dataset-versions/{version_id}/assets/{asset_id}",
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
    "/dataset-versions/{version_id}/publish",
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
