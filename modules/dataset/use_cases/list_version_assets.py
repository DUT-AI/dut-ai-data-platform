from collections.abc import Sequence

from core.exceptions import NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    AssetResponseDTO,
    CursorPageAssetResponseDTO,
)


class ListVersionAssetsUseCase:
    """Lists assets associated with a dataset version using limit and offset pagination."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, version_id: str, limit: int = 100, offset: int = 0
    ) -> Sequence[AssetResponseDTO]:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        assets = await self.repo.list_assets_by_version(
            version_id, limit=limit, offset=offset
        )
        return [AssetResponseDTO.model_validate(a) for a in assets]


class ListVersionAssetsCursorUseCase:
    """Lists assets associated with a dataset version using cursor-based pagination."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, version_id: str, limit: int = 100, cursor_id: str | None = None
    ) -> CursorPageAssetResponseDTO:
        version = await self.repo.get_version_by_id(version_id)
        if not version:
            raise NotFoundException(f"Dataset Version '{version_id}' not found.")

        assets, next_cursor = await self.repo.list_assets_by_version_cursor(
            version_id, limit=limit, cursor_id=cursor_id
        )
        return CursorPageAssetResponseDTO(
            items=[AssetResponseDTO.model_validate(a) for a in assets],
            next_cursor=next_cursor,
        )

