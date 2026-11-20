import httpx
import pytest

from apps.api.deps import get_current_user
from apps.api.deps.roles import require_project_role
from apps.api.main import app
from modules.identity.domain.entities import AuthUser

mock_user = AuthUser(
    id=101,
    name="Test Owner",
    email="owner@dut.ai",
    status="ACTIVE",
    role_names=["USER"],
)


@pytest.fixture(autouse=True)
def override_deps():
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[require_project_role("owner", "admin")] = lambda: "owner"
    app.dependency_overrides[
        require_project_role("owner", "admin", "annotator", "reviewer")
    ] = lambda: "owner"
    yield
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_export_api_full_endpoints():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Test POST export on non-existing snapshot returns 404
        post_res = await client.post(
            "/api/v1/projects/prj_dummy/snapshots/snp_non_existent/exports",
            json={"format": "yolo"},
        )
        assert post_res.status_code == 404

        # 2. Test GET non-existent export package returns 404
        get_res = await client.get(
            "/api/v1/projects/prj_dummy/exports/pkg_non_existent"
        )
        assert get_res.status_code == 404

        # 3. Test GET download non-existent package returns 404
        dl_res = await client.get(
            "/api/v1/projects/prj_dummy/exports/pkg_non_existent/download"
        )
        assert dl_res.status_code == 404

        # 4. Test DELETE non-existent package returns 404
        del_res = await client.delete(
            "/api/v1/projects/prj_dummy/exports/pkg_non_existent"
        )
        assert del_res.status_code == 404
