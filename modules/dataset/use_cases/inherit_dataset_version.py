from core.exceptions import BadRequestException, NotFoundException
from modules.dataset.domain.interfaces import IDatasetRepository
from modules.dataset.dtos.dataset_dtos import (
    InheritDatasetVersionRequestDTO,
    InheritDatasetVersionResponseDTO,
)


class InheritDatasetVersionUseCase:
    """Inherits assets from a source dataset version into a target draft version."""

    def __init__(self, repo: IDatasetRepository) -> None:
        self.repo = repo

    async def execute(
        self, target_version_id: str, payload: InheritDatasetVersionRequestDTO
    ) -> InheritDatasetVersionResponseDTO:
        source_version_id = payload.source_version_id

        if target_version_id == source_version_id:
            raise BadRequestException("A dataset version cannot inherit from itself.")

        target_version = await self.repo.get_version_by_id(target_version_id)
        if not target_version:
            raise NotFoundException(
                f"Target dataset version '{target_version_id}' not found."
            )

        if target_version.status != "draft":
            raise BadRequestException(
                f"Cannot inherit assets into version '{target_version_id}' with status '{target_version.status}'. Only draft versions allow asset inheritance."
            )

        source_version = await self.repo.get_version_by_id(source_version_id)
        if not source_version:
            raise NotFoundException(
                f"Source dataset version '{source_version_id}' not found."
            )

        if source_version.dataset_id != target_version.dataset_id:
            raise BadRequestException(
                "Source dataset version must belong to the same dataset as the target version."
            )

        source_assets = await self.repo.get_all_assets_by_version(source_version_id)
        target_assets = await self.repo.get_all_assets_by_version(target_version_id)
        target_asset_ids = {a.id for a in target_assets}

        added_count = 0
        reused_count = 0

        for ast in source_assets:
            if ast.id in target_asset_ids:
                reused_count += 1
            else:
                await self.repo.add_asset_to_version(target_version_id, ast.id)
                target_asset_ids.add(ast.id)
                added_count += 1

        updated_target = await self.repo.get_version_by_id(target_version_id)
        total_assets = (
            updated_target.asset_count if updated_target else len(target_asset_ids)
        )

        return InheritDatasetVersionResponseDTO(
            target_version_id=target_version_id,
            source_version_id=source_version_id,
            added_assets_count=added_count,
            reused_assets_count=reused_count,
            total_assets_count=total_assets,
        )

