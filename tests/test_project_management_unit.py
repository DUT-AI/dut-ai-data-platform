from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from core.utils.datetime_utils import now_utc
from modules.project.domain.entities import ProjectEntity
from modules.project.domain.events import InMemoryProjectEventPublisher
from modules.project.dtos.project_dtos import ProjectCreateDTO
from modules.project.use_cases import CreateProjectUseCase


def test_project_name_cannot_be_blank() -> None:
    with pytest.raises(ValidationError):
        ProjectCreateDTO(
            name="",
            template_id="traffic-classification",
            storage_provider_key="minio",
        )


def test_archive_and_restore_are_idempotent() -> None:
    project = ProjectEntity(
        name="Traffic", template_id="traffic-classification", created_by="u1"
    )
    assert project.archive(now_utc()) is True
    assert project.archive(now_utc()) is False
    assert project.restore() is True
    assert project.restore() is False


@pytest.mark.asyncio
async def test_create_project_publishes_contract_and_creates_owner_member() -> None:
    repo = AsyncMock()
    catalog = AsyncMock()
    events = InMemoryProjectEventPublisher()
    catalog.get_template.return_value = {
        "id": "traffic-classification",
        "name": "Traffic Classification",
        "modality": "image",
        "default_project_configuration": {
            "tools": [{"type": "rectangle"}],
            "labels": [{"name": "Car"}],
        },
    }
    repo.save.side_effect = lambda project: project
    use_case = CreateProjectUseCase(repo, catalog, events)
    result = await use_case.execute(
        ProjectCreateDTO(name="Traffic", template_id="traffic-classification"),
        "u1",
    )
    assert result.created_by == "u1"
    assert events.events[0].event_type == "ProjectCreated"
    repo.add_member.assert_awaited_once()


