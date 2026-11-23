from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from apps.api.deps.auth import CurrentUser
from apps.api.deps.roles import (
    PROJECT_READ_ROLES,
    PROJECT_WRITE_ROLES,
    require_resource_role,
)
from modules.dataset.domain.import_job import ImportItem, ImportJob
from modules.dataset.dtos.dataset_dtos import (
    AssetImportJobAcceptedDTO,
    AssetResponseDTO,
    CursorPageAssetResponseDTO,
    DatasetVersionCreateDTO,
    DatasetVersionResponseDTO,
    FinalizeAssetImportRequestDTO,
    InheritDatasetVersionRequestDTO,
    InheritDatasetVersionResponseDTO,
    PrepareUploadRequestDTO,
    PrepareUploadResponseDTO,
)
from modules.dataset.use_cases import (
    CreateDatasetVersionUseCase,
    GetDatasetVersionDetailUseCase,
    InheritDatasetVersionUseCase,
    ListVersionAssetsCursorUseCase,
    ListVersionAssetsUseCase,
    PrepareAssetUploadUseCase,
    PublishDatasetVersionUseCase,
    RemoveVersionAssetUseCase,
    RequestAssetImportUseCase,
    StageDirectUploadUseCase,
)

router = APIRouter(tags=["Dataset Versions"])


@router.post(
    "/datasets/{dataset_id}/versions",
    dependencies=[Depends(require_resource_role("dataset", *PROJECT_WRITE_ROLES))],
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
    dependencies=[Depends(require_resource_role("version", *PROJECT_READ_ROLES))],
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
    dependencies=[Depends(require_resource_role("version", *PROJECT_WRITE_ROLES))],
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
    dependencies=[Depends(require_resource_role("version", *PROJECT_READ_ROLES))],
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
    dependencies=[Depends(require_resource_role("version", *PROJECT_READ_ROLES))],
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
    dependencies=[Depends(require_resource_role("version", *PROJECT_WRITE_ROLES))],
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
    dependencies=[Depends(require_resource_role("version", *PROJECT_WRITE_ROLES))],
    response_model=AssetImportJobAcceptedDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Queue presigned-uploaded files for validation and import",
    description=(
        "Returns 202 with a job id. Validation workers check every file; the "
        "assets are recorded only if all files are valid. Poll "
        "GET /asset-import-jobs/{job_id} for the outcome."
    ),
)
@inject
async def finalize_asset_import(
    version_id: str,
    payload: FinalizeAssetImportRequestDTO,
    current_user: CurrentUser,
    use_case: FromDishka[RequestAssetImportUseCase],
):
    job = await use_case.execute(
        version_id,
        [ImportItem(**item.model_dump()) for item in payload.items],
        created_by=current_user.id,
    )
    return _accepted(job)


@router.post(
    "/dataset-versions/{version_id}/assets",
    dependencies=[Depends(require_resource_role("version", *PROJECT_WRITE_ROLES))],
    response_model=AssetImportJobAcceptedDTO,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload files and queue them for validation (Deprecated - Use prepare-upload & finalize-import)",
    deprecated=True,
)
@inject
async def upload_version_assets(
    version_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[StageDirectUploadUseCase],
    files: list[UploadFile] = File(...),
):
    file_tuples: list[tuple[str, bytes, str | None]] = []
    for f in files:
        content = await f.read()
        filename = f.filename or "unnamed_file"
        file_tuples.append((filename, content, f.content_type))

    job = await use_case.execute(version_id, file_tuples, created_by=current_user.id)
    return _accepted(job)


def _accepted(job: ImportJob) -> AssetImportJobAcceptedDTO:
    return AssetImportJobAcceptedDTO(
        job_id=job.id,
        version_id=job.version_id,
        status=job.status,
        total_items=len(job.items),
    )


@router.delete(
    "/dataset-versions/{version_id}/assets/{asset_id}",
    dependencies=[Depends(require_resource_role("version", *PROJECT_WRITE_ROLES))],
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
    dependencies=[Depends(require_resource_role("version", *PROJECT_WRITE_ROLES))],
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
