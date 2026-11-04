from dishka.integrations.fastapi import FromDishka, inject
from fastapi import APIRouter, Query

from apps.api.deps.auth import CurrentUser
from modules.dataset.dtos.dataset_dtos import (
    AssetDownloadUrlResponseDTO,
    AssetResponseDTO,
)
from modules.dataset.use_cases import (
    GetAssetDetailUseCase,
    GetAssetDownloadUrlUseCase,
    RetireAssetUseCase,
)

router = APIRouter(prefix="/assets", tags=["Dataset Assets"])


@router.get(
    "/{asset_id}",
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
    "/{asset_id}/download",
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


@router.put(
    "/{asset_id}/retire",
    response_model=AssetResponseDTO,
    summary="Retire an asset (if no protected references exist)",
)
@inject
async def retire_asset(
    asset_id: str,
    current_user: CurrentUser,
    use_case: FromDishka[RetireAssetUseCase],
):
    return await use_case.execute(asset_id)
