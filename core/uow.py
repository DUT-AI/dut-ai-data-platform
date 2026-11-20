from typing import Protocol


class IUnitOfWork(Protocol):
    """Lets a use case decide when its database changes are committed.

    The request-scoped session still commits at the end of every request, so
    use cases that never touch this interface keep working unchanged. A use
    case takes ``IUnitOfWork`` when it must know, before returning, whether its
    writes were committed, typically to undo a side effect outside the
    database (an object already uploaded to storage) when the commit fails.

    Rules:
    - ``commit()`` is the last database operation of the use case; anything
      written afterwards lands in a new transaction and loses atomicity.
    - Repositories only ``flush()``; they never commit.
    - Implementations share the session the repositories of the request use.
    """

    async def commit(self) -> None:
        """Commit every change of the current transaction. Raises on failure."""
        ...

    async def rollback(self) -> None:
        """Discard every uncommitted change."""
        ...
