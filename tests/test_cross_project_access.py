"""Cross-project authorization (BOLA / IDOR) for dataset & annotation routes.

Policy (plan.md, Phase 0):
- resource does not exist                         -> 404
- caller is not an active member of its project   -> 403
- caller is a member but with a disallowed role   -> 403
"""

import io
from dataclasses import dataclass

import httpx
import pytest
import pytest_asyncio
from PIL import Image

from apps.api.deps import get_current_user
from apps.api.main import app
from core.utils.id_generator import generate_ulid
from modules.annotation.models.annotation import (
    AnnotationModel,
    AnnotationRevisionModel,
)
from modules.identity.domain.entities import AuthUser
from modules.project.models.project import ProjectMemberModel

OWNER_A, OWNER_B, ANNOTATOR_A, INACTIVE_A = 301, 302, 303, 304


def _user(user_id: int) -> AuthUser:
    return AuthUser(
        id=user_id,
        name=f"user-{user_id}",
        email=f"user{user_id}@dut.ai",
        status="ACTIVE",
        role_names=["USER"],
    )


class _CurrentUser:
    def __init__(self) -> None:
        self.user = _user(OWNER_A)

    def as_(self, user_id: int) -> None:
        self.user = _user(user_id)


current = _CurrentUser()


@pytest.fixture(autouse=True)
def override_auth_dep():
    app.dependency_overrides[get_current_user] = lambda: current.user
    yield
    app.dependency_overrides.clear()


@dataclass
class ProjectAFixture:
    project_id: str
    dataset_id: str
    version_id: str
    asset_id: str
    annotation_id: str
    revision_id: str


def _png(color: str) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (8, 8), color).save(buf, format="PNG")
    return buf.getvalue()


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest_asyncio.fixture
async def project_a(client: httpx.AsyncClient, test_session_factory) -> ProjectAFixture:
    current.as_(OWNER_A)
    p = await client.post(
        "/api/v1/projects", json={"name": "BOLA A", "project_type": "detection"}
    )
    assert p.status_code == 201, p.text
    project_id = p.json()["id"]

    d = await client.post(
        f"/api/v1/projects/{project_id}/datasets", json={"name": "Secret dataset"}
    )
    assert d.status_code == 201, d.text
    dataset_id = d.json()["id"]
    version_id = d.json()["versions"][0]["id"]

    u = await client.post(
        f"/api/v1/dataset-versions/{version_id}/assets",
        files=[("files", (f"{generate_ulid()}.png", _png("blue"), "image/png"))],
    )
    assert u.status_code == 201, u.text
    asset_id = u.json()["uploaded_assets"][0]["id"]

    annotation_id, revision_id = generate_ulid(), generate_ulid()
    async with test_session_factory() as session, session.begin():
        session.add_all(
            [
                ProjectMemberModel(
                    id=generate_ulid(),
                    project_id=project_id,
                    user_id=ANNOTATOR_A,
                    role="annotator",
                    status="active",
                ),
                ProjectMemberModel(
                    id=generate_ulid(),
                    project_id=project_id,
                    user_id=INACTIVE_A,
                    role="admin",
                    status="inactive",
                ),
                AnnotationModel(
                    id=annotation_id,
                    asset_id=asset_id,
                    project_id=project_id,
                    created_by=OWNER_A,
                ),
            ]
        )
    async with test_session_factory() as session, session.begin():
        session.add(
            AnnotationRevisionModel(
                id=revision_id,
                annotation_id=annotation_id,
                revision_number=1,
                ontology_version_id="onto_ver_unused",
                created_by=OWNER_A,
            )
        )

    current.as_(OWNER_B)
    pb = await client.post(
        "/api/v1/projects", json={"name": "BOLA B", "project_type": "detection"}
    )
    assert pb.status_code == 201, pb.text

    return ProjectAFixture(
        project_id, dataset_id, version_id, asset_id, annotation_id, revision_id
    )


READ, WRITE, LABEL = "read", "write", "label"

# (method, path template, json body, role group)
ROUTES: list[tuple[str, str, dict | None, str]] = [
    ("GET", "/api/v1/datasets/{dataset_id}", None, READ),
    ("PATCH", "/api/v1/datasets/{dataset_id}", {"name": "pwned"}, WRITE),
    ("PUT", "/api/v1/datasets/{dataset_id}/archive", None, WRITE),
    ("POST", "/api/v1/datasets/{dataset_id}/versions", {"version": "v9.9.9"}, WRITE),
    ("GET", "/api/v1/dataset-versions/{version_id}", None, READ),
    (
        "POST",
        "/api/v1/dataset-versions/{version_id}/inherit",
        {"source_version_id": "src_unused"},
        WRITE,
    ),
    ("GET", "/api/v1/dataset-versions/{version_id}/assets", None, READ),
    ("GET", "/api/v1/dataset-versions/{version_id}/assets/cursor", None, READ),
    (
        "POST",
        "/api/v1/dataset-versions/{version_id}/prepare-upload",
        {"files": [{"filename": "x.png", "content_type": "image/png"}]},
        WRITE,
    ),
    (
        "POST",
        "/api/v1/dataset-versions/{version_id}/finalize-import",
        {
            "items": [
                {
                    "asset_id": "a1",
                    "filename": "x.png",
                    "storage_key": "k",
                    "sha256": "0" * 64,
                    "file_size": 1,
                    "mime_type": "image/png",
                }
            ]
        },
        WRITE,
    ),
    ("DELETE", "/api/v1/dataset-versions/{version_id}/assets/{asset_id}", None, WRITE),
    ("PUT", "/api/v1/dataset-versions/{version_id}/publish", None, WRITE),
    ("GET", "/api/v1/assets/{asset_id}", None, READ),
    ("GET", "/api/v1/assets/{asset_id}/download", None, READ),
    ("PUT", "/api/v1/assets/{asset_id}/retire", None, WRITE),
    ("GET", "/api/v1/assets/{asset_id}/annotations", None, READ),
    ("GET", "/api/v1/annotations/{annotation_id}", None, READ),
    ("GET", "/api/v1/annotations/{annotation_id}/revisions", None, READ),
    (
        "POST",
        "/api/v1/annotations/{annotation_id}/revisions",
        {"results": []},
        LABEL,
    ),
    ("GET", "/api/v1/annotation-revisions/{revision_id}", None, READ),
]

ROUTE_IDS = [f"{m} {p}" for m, p, _, _ in ROUTES]


def _fill(path: str, fx: ProjectAFixture, *, missing: bool = False) -> str:
    values = {
        "dataset_id": fx.dataset_id,
        "version_id": fx.version_id,
        "asset_id": fx.asset_id,
        "annotation_id": fx.annotation_id,
        "revision_id": fx.revision_id,
    }
    if missing:
        values = {k: f"missing_{k}" for k in values}
    return path.format(**values)


@pytest.mark.asyncio
@pytest.mark.parametrize(("method", "path", "body", "_group"), ROUTES, ids=ROUTE_IDS)
async def test_member_of_other_project_is_forbidden(
    client, project_a, method, path, body, _group
):
    current.as_(OWNER_B)
    res = await client.request(method, _fill(path, project_a), json=body)
    assert res.status_code == 403, res.text


@pytest.mark.asyncio
@pytest.mark.parametrize(("method", "path", "body", "_group"), ROUTES, ids=ROUTE_IDS)
async def test_inactive_member_is_forbidden(
    client, project_a, method, path, body, _group
):
    current.as_(INACTIVE_A)
    res = await client.request(method, _fill(path, project_a), json=body)
    assert res.status_code == 403, res.text


@pytest.mark.asyncio
@pytest.mark.parametrize(("method", "path", "body", "_group"), ROUTES, ids=ROUTE_IDS)
async def test_unknown_resource_is_not_found(
    client, project_a, method, path, body, _group
):
    current.as_(OWNER_A)
    res = await client.request(method, _fill(path, project_a, missing=True), json=body)
    assert res.status_code == 404, res.text


@pytest.mark.asyncio
@pytest.mark.parametrize(("method", "path", "body", "group"), ROUTES, ids=ROUTE_IDS)
async def test_annotator_role_matrix(client, project_a, method, path, body, group):
    current.as_(ANNOTATOR_A)
    res = await client.request(method, _fill(path, project_a), json=body)
    if group == WRITE:
        assert res.status_code == 403, res.text
    else:
        # Authorized: the business outcome may still fail (e.g. a missing
        # ontology version -> 404), but never with an access error.
        assert res.status_code not in (401, 403), res.text


@pytest.mark.asyncio
async def test_owner_can_read_own_resources(client, project_a):
    current.as_(OWNER_A)
    for method, path, _, group in ROUTES:
        if group != READ:
            continue
        res = await client.request(method, _fill(path, project_a))
        assert res.status_code == 200, f"{method} {path}: {res.text}"


@pytest.mark.asyncio
async def test_batch_status_rejects_foreign_assets(client, project_a):
    current.as_(OWNER_B)
    res = await client.post(
        "/api/v1/annotations/batch-status", json={"asset_ids": [project_a.asset_id]}
    )
    assert res.status_code == 403, res.text

    # Unknown ids reveal nothing and are not an error.
    res = await client.post(
        "/api/v1/annotations/batch-status", json={"asset_ids": ["missing_asset"]}
    )
    assert res.status_code == 200, res.text

    current.as_(OWNER_A)
    res = await client.post(
        "/api/v1/annotations/batch-status", json={"asset_ids": [project_a.asset_id]}
    )
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_create_annotation_requires_asset_of_payload_project(client, project_a):
    body = {
        "asset_id": project_a.asset_id,
        "project_id": project_a.project_id,
        "ontology_version_id": "onto_ver_unused",
        "results": [],
    }
    current.as_(OWNER_B)
    res = await client.post("/api/v1/annotations", json=body)
    assert res.status_code == 403, res.text

    res = await client.post(
        "/api/v1/annotations", json={**body, "asset_id": "missing_asset"}
    )
    assert res.status_code == 404, res.text


@pytest.mark.asyncio
async def test_finalize_import_rejects_storage_key_of_other_project(client, project_a):
    current.as_(OWNER_A)
    res = await client.post(
        f"/api/v1/dataset-versions/{project_a.version_id}/finalize-import",
        json={
            "items": [
                {
                    "asset_id": "stolen",
                    "filename": "x.png",
                    "storage_key": "project-other/assets/stolen/x.png",
                    "sha256": "1" * 64,
                    "file_size": 1,
                    "mime_type": "image/png",
                }
            ]
        },
    )
    assert res.status_code == 403, res.text


def test_every_project_scoped_route_declares_authorization():
    """Guard against new routes shipping without a project permission check."""
    from fastapi.routing import APIRoute

    guarded_prefixes = (
        "/api/v1/datasets",
        "/api/v1/dataset-versions",
        "/api/v1/assets",
        "/api/v1/annotations",
        "/api/v1/annotation-revisions",
    )
    # Checked inside the route body via ProjectAuthorizer (ids come from the body).
    body_checked = {
        ("POST", "/api/v1/annotations"),
        ("POST", "/api/v1/annotations/batch-status"),
    }

    def dependency_names(dependant) -> set[str]:
        names = set()
        for dep in dependant.dependencies:
            names.add(getattr(dep.call, "__name__", ""))
            names |= dependency_names(dep)
        return names

    unguarded = []
    for route in app.routes:
        if not isinstance(route, APIRoute) or not route.path.startswith(guarded_prefixes):
            continue
        for method in route.methods:
            key = (method, route.path)
            if key in body_checked:
                continue
            names = dependency_names(route.dependant)
            if not any(n.startswith("require_") for n in names):
                unguarded.append(key)

    assert unguarded == []
