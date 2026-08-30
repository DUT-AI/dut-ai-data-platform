from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol

from core.utils.id_generator import generate_ulid


@dataclass(frozen=True)
class ProjectDomainEvent:
    event_type: str
    project_id: str
    payload: dict[str, Any]
    event_id: str = field(default_factory=generate_ulid)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class IProjectEventPublisher(Protocol):
    async def publish(self, event: ProjectDomainEvent) -> None: ...


class InMemoryProjectEventPublisher(IProjectEventPublisher):
    def __init__(self) -> None:
        self.events: list[ProjectDomainEvent] = []

    async def publish(self, event: ProjectDomainEvent) -> None:
        self.events.append(event)
