from datetime import UTC, datetime


def now_utc() -> datetime:
    """Return the current timezone-aware UTC datetime."""
    return datetime.now(UTC)
