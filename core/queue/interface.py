from typing import Any, Protocol


class IJobQueue(Protocol):
    """Hands work to background workers. Implementations must not depend on callers."""

    async def enqueue(self, function: str, *args: Any, job_id: str) -> None:
        """Queue ``function(*args)``; enqueuing an already queued ``job_id`` is a no-op."""
        ...


class IKeyValueStore(Protocol):
    """Minimal string key/value store with expiry (backed by Redis)."""

    async def get(self, key: str) -> str | None: ...

    async def set(self, key: str, value: str, *, ttl_seconds: int) -> None: ...

    async def delete(self, key: str) -> None: ...
