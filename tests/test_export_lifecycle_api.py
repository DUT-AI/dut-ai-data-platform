from unittest.mock import AsyncMock

import pytest

from modules.export.application.use_cases.delete_export_package import (
    DeleteExportPackageUseCase,
)
from modules.export.application.use_cases.get_export_download_url import (
    GetExportDownloadUrlUseCase,
)
from modules.export.application.use_cases.get_export_package import (
    GetExportPackageUseCase,
)
from modules.export.application.use_cases.list_export_packages import (
    ListExportPackagesUseCase,
)
from modules.export.domain.entities import ExportPackageEntity
from modules.export.domain.exceptions import ExportPackageNotFoundError
from modules.export.domain.value_objects import (
    ExportFormatType,
    ExportStatus,
)


@pytest.mark.asyncio
async def test_export_lifecycle_use_cases():
    package_repo = AsyncMock()
    storage_gateway = AsyncMock()

    pkg = ExportPackageEntity(
        id="pkg_test_100",
        project_id="prj_100",
        snapshot_id="snp_100",
        format=ExportFormatType.YOLO,
        created_by=42,
        status=ExportStatus.READY,
        storage_uri="s3://bucket/test.zip",
    )
    package_repo.get_by_id.return_value = pkg
    package_repo.list_by_project.return_value = ([pkg], 1)
    package_repo.delete.return_value = True
    storage_gateway.get_presigned_download_url.return_value = (
        "https://s3.dut.ai/download/test.zip?signature=xyz"
    )
    storage_gateway.delete_package.return_value = True

    # 1. Get package
    get_uc = GetExportPackageUseCase(package_repo=package_repo)
    found = await get_uc.execute("prj_100", "pkg_test_100")
    assert found.id == "pkg_test_100"

    # Mismatched project
    with pytest.raises(ExportPackageNotFoundError):
        await get_uc.execute("prj_wrong", "pkg_test_100")

    # 2. List packages
    list_uc = ListExportPackagesUseCase(package_repo=package_repo)
    items, total = await list_uc.execute("prj_100")
    assert total == 1
    assert items[0].id == "pkg_test_100"

    # 3. Download package
    download_uc = GetExportDownloadUrlUseCase(
        package_repo=package_repo, storage_gateway=storage_gateway
    )
    url = await download_uc.execute("prj_100", "pkg_test_100")
    assert "https://s3.dut.ai/download" in url
    storage_gateway.get_presigned_download_url.assert_called_once_with(
        storage_uri="s3://bucket/test.zip", expires_seconds=1800
    )

    # 4. Delete package
    delete_uc = DeleteExportPackageUseCase(
        package_repo=package_repo, storage_gateway=storage_gateway
    )
    deleted = await delete_uc.execute("prj_100", "pkg_test_100")
    assert deleted is True
    storage_gateway.delete_package.assert_called_once_with("s3://bucket/test.zip")
    package_repo.delete.assert_called_once_with("pkg_test_100")
