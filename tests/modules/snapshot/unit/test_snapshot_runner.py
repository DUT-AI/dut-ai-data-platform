import asyncio
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from modules.snapshot.infrastructure.background import snapshot_runner
from modules.snapshot.infrastructure.background.snapshot_runner import (
    SnapshotJobRunner,
)


class FakeSessionFactory:
    """Mimics async_sessionmaker: each call yields a new, tracked session."""

    def __init__(self) -> None:
        self.opened: list[object] = []
        self.closed: list[object] = []

    def __call__(self):
        @asynccontextmanager
        async def session_scope():
            session = object()
            self.opened.append(session)
            try:
                yield session
            finally:
                self.closed.append(session)

        return session_scope()


@pytest.mark.asyncio
async def test_each_run_uses_its_own_session_and_closes_it():
    factory = FakeSessionFactory()
    runner = SnapshotJobRunner(factory, storage_provider=MagicMock())
    worker = MagicMock()
    worker.execute = AsyncMock(return_value="done")

    with patch.object(snapshot_runner, "build_snapshot_worker", return_value=worker) as build:
        assert await runner.run("snap-1") == "done"
        await runner.run("snap-2")

    assert len(factory.opened) == 2
    assert factory.opened[0] is not factory.opened[1]
    assert factory.closed == factory.opened
    assert build.call_args_list[0].args[0] is factory.opened[0]


@pytest.mark.asyncio
async def test_launch_keeps_task_alive_and_logs_crash():
    runner = SnapshotJobRunner(FakeSessionFactory(), storage_provider=MagicMock())
    started = asyncio.Event()
    release = asyncio.Event()

    async def crashing_run(snapshot_id: str):
        started.set()
        await release.wait()
        raise RuntimeError("worker crashed")

    with patch.object(runner, "run", side_effect=crashing_run):
        runner.launch("snap-1")
        await started.wait()
        assert len(runner._tasks) == 1  # referenced while running

        with patch.object(snapshot_runner.logger, "error") as log_error:
            release.set()
            for _ in range(5):
                await asyncio.sleep(0)

    assert runner._tasks == set()
    log_error.assert_called_once()
