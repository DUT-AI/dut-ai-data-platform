import json
from unittest.mock import patch

import pytest
from dishka import make_async_container

from modules.project.di import ProjectProvider
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository
from modules.project.repository.catalog_repository import (
    InMemoryProjectCatalogRepository,
    TemplateCatalogLoader,
    TemplateCatalogLoadError,
)


def _write(tmp_path, payload) -> object:
    path = tmp_path / "templates.json"
    path.write_text(payload if isinstance(payload, str) else json.dumps(payload), encoding="utf-8")
    return path


def test_loader_parses_templates_and_default_configuration(tmp_path):
    path = _write(
        tmp_path,
        {
            "groups": ["Vision"],
            "templates": [
                {"id": "det", "title": "Detection", "group": "Vision", "labels": ["car"]}
            ],
        },
    )

    catalog = TemplateCatalogLoader.load(path)

    assert catalog.groups == ("Vision",)
    assert catalog.by_id["det"]["default_project_configuration"] == {
        "labels": ["car"],
        "tools": [],
        "modality": "image",
    }


def test_loader_fails_fast_on_missing_file(tmp_path):
    with pytest.raises(TemplateCatalogLoadError, match="not found"):
        TemplateCatalogLoader.load(tmp_path / "missing.json")


def test_loader_fails_fast_on_invalid_json(tmp_path):
    with pytest.raises(TemplateCatalogLoadError, match="not valid JSON"):
        TemplateCatalogLoader.load(_write(tmp_path, "{not json"))


@pytest.mark.asyncio
async def test_callers_cannot_mutate_the_shared_catalog(tmp_path):
    path = _write(tmp_path, {"templates": [{"id": "det", "title": "Detection"}]})
    repo = InMemoryProjectCatalogRepository(TemplateCatalogLoader.load(path))

    (await repo.get_template("det"))["title"] = "tampered"
    (await repo.list_templates())[0]["title"] = "tampered"

    assert (await repo.get_template("det"))["title"] == "Detection"


@pytest.mark.asyncio
async def test_repository_is_app_scoped_and_file_is_read_once():
    """templates.json is read once per container, not on every request."""
    container = make_async_container(ProjectProvider(), skip_validation=True)
    repos: list[IProjectCatalogRepository] = []
    try:
        with patch.object(
            TemplateCatalogLoader, "load", wraps=TemplateCatalogLoader.load
        ) as load:
            for _ in range(3):
                async with container() as request_container:
                    repos.append(await request_container.get(IProjectCatalogRepository))
    finally:
        await container.close()

    assert load.call_count == 1
    assert all(repo is repos[0] for repo in repos)
