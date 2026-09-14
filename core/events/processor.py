from collections.abc import Callable, Awaitable
from typing import Any

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from core.events.outbox import SqlOutboxRepository


EventHandlerCallable = Callable[[dict[str, Any]], Awaitable[None]]


class OutboxProcessor:
    """Processes pending transactional outbox events in background worker loop."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandlerCallable]] = {}

    def register_handler(
        self, event_type: str, handler: EventHandlerCallable
    ) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def process_pending_batch(self, session: AsyncSession, limit: int = 50) -> int:
        outbox_repo = SqlOutboxRepository(session)
        pending_events = await outbox_repo.fetch_pending_events(limit=limit)

        processed_count = 0
        for event_model in pending_events:
            try:
                handlers = self._handlers.get(event_model.event_type, [])
                if handlers:
                    for handler in handlers:
                        await handler(event_model.payload)
                else:
                    logger.info(
                        f"Outbox event '{event_model.event_type}' ({event_model.event_id}) dispatched (No custom handlers)."
                    )

                await outbox_repo.mark_processed(event_model.event_id)
                processed_count += 1
            except Exception as e:
                logger.error(
                    f"Failed to process outbox event {event_model.event_id}: {e}"
                )
                await outbox_repo.mark_failed(event_model.event_id, str(e))

        await session.commit()
        return processed_count
