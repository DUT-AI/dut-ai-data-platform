import pytest

from modules.snapshot.infrastructure.background.snapshot_worker import (
    _cancelled_snapshots,
)


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """No-op fixture to prevent integration tests from triggering global in-memory DB locks."""
    yield


@pytest.fixture(autouse=True)
def reset_cancellations():
    _cancelled_snapshots.clear()
    yield
    _cancelled_snapshots.clear()
