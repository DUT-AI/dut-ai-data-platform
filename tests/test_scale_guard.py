from unittest.mock import AsyncMock

import pytest

from modules.export.application.dtos.export_dtos import ExportCreateRequest
from modules.export.application.use_cases.create_export_package import (
    CreateExportPackageUseCase,
)
from modules.export.domain.exceptions import ScaleLimitExceededError
from modules.export.domain.interfaces import SnapshotExportContext
from modules.export.domain.value_objects import (
    ExportFormatType,
    MediaMode,
)


@pytest.mark.asyncio
async def test_scale_guard_rejects_more_than_5000_items_in_full_bundle():
    package_repo = AsyncMock()
    package_repo.get_by_idempotency.return_value = None

    snapshot_gateway = AsyncMock()
    snapshot_gateway.get_export_context.return_value = SnapshotExportContext(
        snapshot_id="snp_01",
        project_id="prj_01",
        version_name="v1.0.0",
        dataset_version_id="dsv_01",
        ontology_version_id="ont_01",
        outputs=[],
        categories=[],
        total_items=5001,  # Exceeds 5,000 limit
    )

    worker = AsyncMock()
    use_case = CreateExportPackageUseCase(
        package_repo=package_repo,
        snapshot_gateway=snapshot_gateway,
        worker=worker,
    )

    request = ExportCreateRequest(
        format=ExportFormatType.YOLO,
        media_mode=MediaMode.FULL_BUNDLE,
    )

    with pytest.raises(ScaleLimitExceededError) as exc_info:
        await use_case.execute(
            project_id="prj_01",
            snapshot_id="snp_01",
            request=request,
            user_id=1,
        )

    assert "exceeds 5,000 files limit" in str(exc_info.value.message)
    worker.execute.assert_not_called()
