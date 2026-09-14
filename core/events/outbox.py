from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.events.domain_event import DomainEvent
from core.events.models import OutboxEventModel


class IOutboxRepository(Protocol):
    """Interface for Transactional Outbox persistence operations."""

    async def save_event(self, event: DomainEvent) -> OutboxEventModel:
        ...

    async def fetch_pending_events(
        self, limit: int = 50
    ) -> Sequence[OutboxEventModel]:
        ...

    async def mark_processed(self, event_id: str) -> None:
        ...

    async def mark_failed(self, event_id: str, error_message: str) -> None:
        ...


class SqlOutboxRepository(IOutboxRepository):
    """SQLAlchemy implementation of the Transactional Outbox repository."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save_event(self, event: DomainEvent) -> OutboxEventModel:
        model = OutboxEventModel(
            event_id=event.event_id,
            event_type=event.event_type,
            aggregate_type=event.aggregate_type,
            aggregate_id=event.aggregate_id,
            payload=event.payload,
            status="PENDING",
            occurred_at=event.occurred_at,
        )
        self.session.add(model)
        await self.session.flush()
        return model

    async def fetch_pending_events(
        self, limit: int = 50
    ) -> Sequence[OutboxEventModel]:
        stmt = (
            select(OutboxEventModel)
            .where(OutboxEventModel.status == "PENDING")
            .order_by(OutboxEventModel.occurred_at.asc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return res.scalars().all()

    async def mark_processed(self, event_id: str) -> None:
        stmt = select(OutboxEventModel).where(OutboxEventModel.event_id == event_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if model:
            model.status = "PROCESSED"
            model.processed_at = datetime.now(UTC)
            await self.session.flush()

    async def mark_failed(self, event_id: str, error_message: str) -> None:
        stmt = select(OutboxEventModel).where(OutboxEventModel.event_id == event_id)
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        if model:
            model.status = "FAILED"
            model.error_message = error_message
            model.retry_count += 1
            await self.session.flush()
