from abc import ABC
from collections.abc import Callable, Coroutine
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from domain.id_generator import generate_ulid


class DomainEvent(BaseModel, ABC):
    event_id: str = Field(default_factory=generate_ulid)
    occurred_at: datetime = Field(default_factory=datetime.utcnow)


EventHandler = Callable[[DomainEvent], Coroutine[Any, Any, None]]


class EventBus:
    def __init__(self):
        self._handlers: dict[type[DomainEvent], list[EventHandler]] = {}

    def subscribe(self, event_type: type[DomainEvent], handler: EventHandler) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def publish(self, event: DomainEvent) -> None:
        event_type = type(event)
        if event_type in self._handlers:
            for handler in self._handlers[event_type]:
                await handler(event)


# Global event bus instance
event_bus = EventBus()
