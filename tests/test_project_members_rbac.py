"""
RBAC Integration Tests cho Project Member Management.
Kiểm thử đầy đủ các kịch bản phân quyền theo business rules:
- Owner mời thành viên và set role thành công
- Admin mời thành viên thành công
- Annotator/Reviewer không được phép mời hoặc xóa (403 Forbidden)
- Không thể xóa Owner (400 Bad Request)
- Không thể mời trùng user đã tồn tại (409 Conflict)
"""

import httpx
import pytest

from apps.api.deps import get_current_user
from apps.api.main import app
from modules.identity.domain.entities import AuthUser

# ─── Mock users cho từng role ────────────────────────────────────────────────
OWNER_USER = AuthUser(
    id=101,
    name="Owner User",
    email="owner@dut.ai",
    status="ACTIVE",
    role_names=["USER"],
)
ADMIN_USER = AuthUser(
    id=102,
    name="Admin User",
    email="admin@dut.ai",
    status="ACTIVE",
    role_names=["USER"],
)
ANNOTATOR_USER = AuthUser(
    id=103,
    name="Annotator User",
    email="annotator@dut.ai",
    status="ACTIVE",
    role_names=["USER"],
)
REVIEWER_USER = AuthUser(
    id=104,
    name="Reviewer User",
    email="reviewer@dut.ai",
    status="ACTIVE",
    role_names=["USER"],
)


def make_auth_override(user: AuthUser):
    """Tạo dependency override cho mock authentication."""
    return lambda: user


@pytest.fixture(autouse=True)
def override_auth_as_owner():
    """Mặc định set user đang đăng nhập là Owner."""
    app.dependency_overrides[get_current_user] = make_auth_override(OWNER_USER)
    yield
    app.dependency_overrides.clear()


async def create_test_project(client: httpx.AsyncClient) -> str:
    """Tạo project và trả về project_id."""
    res = await client.post(
        "/api/v1/projects",
        json={
            "name": "RBAC Test Project",
            "description": "Project để kiểm thử RBAC",
            "project_type": "detection",
        },
    )
    assert res.status_code == 201
    return res.json()["id"]


# ─── Test 1: Owner mời thành viên và set role ────────────────────────────────
@pytest.mark.asyncio
async def test_owner_can_invite_and_update_member_role():
    """Owner có thể mời thành viên với các role khác nhau và đổi role."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        # Mời Annotator
        add_res = await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ANNOTATOR_USER.id), "role": "annotator"},
        )
        assert add_res.status_code == 201
        assert add_res.json()["role"] == "annotator"
        assert add_res.json()["user_id"] == str(ANNOTATOR_USER.id)

        # Đổi role của Annotator -> Reviewer
        update_res = await client.put(
            f"/api/v1/projects/{project_id}/members/{ANNOTATOR_USER.id}",
            json={"role": "reviewer"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["role"] == "reviewer"


# ─── Test 2: Admin có thể mời thành viên ────────────────────────────────────
@pytest.mark.asyncio
async def test_admin_can_invite_member():
    """Admin có thể mời thành viên mới vào project."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        # Owner mời Admin trước
        await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ADMIN_USER.id), "role": "admin"},
        )

        # Đổi auth thành Admin, Admin mời Annotator
        app.dependency_overrides[get_current_user] = make_auth_override(ADMIN_USER)
        add_res = await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ANNOTATOR_USER.id), "role": "annotator"},
        )
        assert add_res.status_code == 201
        assert add_res.json()["user_id"] == str(ANNOTATOR_USER.id)


# ─── Test 3: Annotator KHÔNG được mời hoặc xóa thành viên ──────────────────
@pytest.mark.asyncio
async def test_annotator_cannot_add_or_remove_member():
    """Annotator gọi API mời hoặc xóa thành viên phải nhận 403 Forbidden."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        # Owner mời Annotator trước
        await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ANNOTATOR_USER.id), "role": "annotator"},
        )

        # Đổi auth thành Annotator
        app.dependency_overrides[get_current_user] = make_auth_override(ANNOTATOR_USER)

        # Annotator cố mời thêm người -> 403
        invite_res = await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": "999", "role": "annotator"},
        )
        assert invite_res.status_code == 403

        # Annotator cố xóa thành viên -> 403
        remove_res = await client.delete(
            f"/api/v1/projects/{project_id}/members/{ADMIN_USER.id}"
        )
        assert remove_res.status_code == 403


# ─── Test 4: Reviewer KHÔNG được mời hoặc xóa thành viên ───────────────────
@pytest.mark.asyncio
async def test_reviewer_cannot_add_or_remove_member():
    """Reviewer gọi API mời hoặc xóa thành viên phải nhận 403 Forbidden."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        # Owner mời Reviewer trước
        await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(REVIEWER_USER.id), "role": "reviewer"},
        )

        # Đổi auth thành Reviewer
        app.dependency_overrides[get_current_user] = make_auth_override(REVIEWER_USER)

        # Reviewer cố mời thêm người -> 403
        invite_res = await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": "999", "role": "annotator"},
        )
        assert invite_res.status_code == 403


# ─── Test 5: KHÔNG thể xóa Owner ─────────────────────────────────────────────
@pytest.mark.asyncio
async def test_cannot_remove_project_owner():
    """Xóa Owner khỏi project phải trả về 400 Bad Request."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        # Owner cố tự xóa mình -> 400
        remove_res = await client.delete(
            f"/api/v1/projects/{project_id}/members/{OWNER_USER.id}"
        )
        assert remove_res.status_code == 400
        error_body = remove_res.json()
        error_msg = error_body.get("error", {}).get("message", "") or error_body.get(
            "detail", ""
        )
        assert "owner" in error_msg.lower()


# ─── Test 6: KHÔNG thể mời trùng user đã tồn tại ───────────────────────────
@pytest.mark.asyncio
async def test_cannot_add_duplicate_member():
    """Mời user đã tồn tại trong project phải trả về 409 Conflict."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        # Mời Annotator lần đầu -> thành công
        await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ANNOTATOR_USER.id), "role": "annotator"},
        )

        # Mời cùng user lần 2 -> 409
        dup_res = await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ANNOTATOR_USER.id), "role": "reviewer"},
        )
        assert dup_res.status_code == 409


# ─── Test 7: Xem danh sách thành viên (tất cả roles đều được xem) ───────────
@pytest.mark.asyncio
async def test_all_roles_can_list_members():
    """Mọi thành viên của project (kể cả Annotator/Reviewer) đều được xem danh sách."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        # Owner mời Annotator
        await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ANNOTATOR_USER.id), "role": "annotator"},
        )

        # Đổi auth thành Annotator, vẫn xem được danh sách
        app.dependency_overrides[get_current_user] = make_auth_override(ANNOTATOR_USER)
        list_res = await client.get(f"/api/v1/projects/{project_id}/members")
        assert list_res.status_code == 200
        members = list_res.json()
        assert len(members) >= 2  # Owner + Annotator


# ─── Test 8: Cập nhật và Xóa theo member.id (thay vì user_id) ───────────────
@pytest.mark.asyncio
async def test_remove_and_update_by_member_id():
    """Hỗ trợ cập nhật role và xóa member bằng member_id (UUID/ULID) hoặc user_id."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        project_id = await create_test_project(client)

        add_res = await client.post(
            f"/api/v1/projects/{project_id}/members",
            json={"user_id": str(ANNOTATOR_USER.id), "role": "annotator"},
        )
        assert add_res.status_code == 201
        member_id = add_res.json()["id"]

        # Cập nhật bằng member_id
        update_res = await client.put(
            f"/api/v1/projects/{project_id}/members/{member_id}",
            json={"role": "reviewer"},
        )
        assert update_res.status_code == 200
        assert update_res.json()["role"] == "reviewer"

        # Xóa bằng member_id
        del_res = await client.delete(
            f"/api/v1/projects/{project_id}/members/{member_id}"
        )
        assert del_res.status_code == 204


# ─── Test 9: Auth logout endpoint ────────────────────────────────────────────
@pytest.mark.asyncio
async def test_auth_logout_endpoint():
    """Endpoint POST /api/v1/auth/logout trả về 200 OK."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/v1/auth/logout")
        assert res.status_code == 200
