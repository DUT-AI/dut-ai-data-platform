from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from core.exceptions import BadRequestException
from core.utils.datetime_utils import now_utc
from modules.project.domain.catalog_entities import (
    ProjectTemplateVersionEntity,
    TaskDefinitionVersionEntity,
)
from modules.project.domain.entities import ProjectEntity
from modules.project.domain.events import InMemoryProjectEventPublisher
from modules.project.dtos.project_dtos import ProjectCreateDTO
from modules.project.use_cases.catalog_use_cases import (
    ChangeTaskDefinitionVersionStatusUseCase,
)
from modules.project.use_cases.project_use_cases import CreateProjectUseCase


def test_project_name_cannot_be_blank() -> None:
    with pytest.raises(ValidationError):
        ProjectCreateDTO(
            name="",
            task_definition_version_id="task-v1",
            annotation_provider_key="label_studio",
            storage_provider_key="minio",
        )


def test_archive_and_restore_are_idempotent() -> None:
    project = ProjectEntity(
        name="Traffic", task_definition_version_id="task-v1", created_by="u1"
    )
    assert project.archive(now_utc()) is True
    assert project.archive(now_utc()) is False
    assert project.restore() is True
    assert project.restore() is False


@pytest.mark.asyncio
async def test_create_project_rejects_unpublished_task_version() -> None:
    repo = AsyncMock()
    catalog = AsyncMock()
    catalog.get_task_version.return_value = TaskDefinitionVersionEntity(
        task_definition_id="task",
        version="1.0",
        input_schema={},
        capability_schema={},
        status="draft",
    )
    use_case = CreateProjectUseCase(repo, catalog, InMemoryProjectEventPublisher())
    with pytest.raises(BadRequestException, match="not published"):
        await use_case.execute(
            ProjectCreateDTO(name="Traffic", task_definition_version_id="task-v1"), "u1"
        )


@pytest.mark.asyncio
async def test_create_project_rejects_incompatible_provider() -> None:
    repo = AsyncMock()
    catalog = AsyncMock()
    catalog.get_task_version.return_value = TaskDefinitionVersionEntity(
        task_definition_id="task",
        version="1.0",
        input_schema={},
        capability_schema={},
        status="published",
    )
    catalog.get_template_version.return_value = ProjectTemplateVersionEntity(
        project_template_id="template", version="1.0", status="published"
    )
    catalog.get_template.return_value = {"task_definition_id": "task"}
    catalog.provider_supported.return_value = False
    use_case = CreateProjectUseCase(repo, catalog, InMemoryProjectEventPublisher())
    with pytest.raises(BadRequestException, match="not supported"):
        await use_case.execute(
            ProjectCreateDTO(
                name="Traffic",
                task_definition_version_id="task-v1",
                project_template_version_id="template-v1",
                annotation_provider_key="unsupported",
            ),
            "u1",
        )


@pytest.mark.asyncio
async def test_create_project_publishes_contract_without_creating_member() -> None:
    repo = AsyncMock()
    catalog = AsyncMock()
    events = InMemoryProjectEventPublisher()
    catalog.get_task_version.return_value = TaskDefinitionVersionEntity(
        task_definition_id="task",
        version="1.0",
        input_schema={},
        capability_schema={},
        status="published",
    )
    repo.save.side_effect = lambda project: project
    use_case = CreateProjectUseCase(repo, catalog, events)
    result = await use_case.execute(
        ProjectCreateDTO(name="Traffic", task_definition_version_id="task-v1"), "u1"
    )
    assert result.created_by == "u1"
    assert events.events[0].event_type == "ProjectCreated"
    repo.add_member.assert_not_awaited()


@pytest.mark.asyncio
async def test_publish_task_version_sets_timestamp_and_emits_event() -> None:
    catalog = AsyncMock()
    version = TaskDefinitionVersionEntity(
        task_definition_id="task",
        version="1.0",
        input_schema={},
        capability_schema={},
    )
    catalog.get_task_version.return_value = version
    events = InMemoryProjectEventPublisher()

    result = await ChangeTaskDefinitionVersionStatusUseCase(catalog, events).execute(
        version.id, "published"
    )

    assert result["status"] == "published"
    assert result["published_at"] is not None
    assert events.events[0].event_type == "TaskDefinitionVersionPublished"
    catalog.save_task_version.assert_awaited_once_with(version)


@pytest.mark.asyncio
async def test_deprecated_task_version_cannot_be_republished() -> None:
    catalog = AsyncMock()
    catalog.get_task_version.return_value = TaskDefinitionVersionEntity(
        task_definition_id="task",
        version="1.0",
        input_schema={},
        capability_schema={},
        status="deprecated",
    )
    use_case = ChangeTaskDefinitionVersionStatusUseCase(
        catalog, InMemoryProjectEventPublisher()
    )

    with pytest.raises(BadRequestException, match="cannot be republished"):
        await use_case.execute("task-v1", "published")
