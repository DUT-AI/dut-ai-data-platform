from unittest.mock import AsyncMock, MagicMock

import pytest

from core.utils.id_generator import generate_ulid
from modules.snapshot.infrastructure.persistence.models import SnapshotItemModel
from modules.snapshot.infrastructure.repositories.snapshot_item_repository import (
    SqlSnapshotItemRepository,
)


@pytest.mark.asyncio
async def test_keyset_pagination_streaming():
    # Mock AsyncSession to test keyset query logic
    session = MagicMock()

    # Generate 15 simulated items with sortable ULIDs
    ulids = sorted([generate_ulid() for _ in range(15)])
    mock_models = [
        SnapshotItemModel(
            id=ulid,
            snapshot_id="snap-1",
            asset_id=f"asset-{i}",
            annotation_revision_id=f"rev-{i}",
            split="train" if i < 10 else "validation",
            item_checksum=f"chk-{i}",
            sort_order=i,
        )
        for i, ulid in enumerate(ulids)
    ]

    async def mock_execute(stmt):
        # We simulate the B-Tree index seek: WHERE id > cursor LIMIT limit + 1
        # Extract limit from query or use mock slices
        res = MagicMock()
        return res

    repo = SqlSnapshotItemRepository(session)

    # Unit verification of keyset pagination mechanics using mock return
    res_page1 = MagicMock()
    # First page: returns 10 items + 1 lookahead
    res_page1.scalars.return_value.all.return_value = mock_models[:11]
    session.execute = AsyncMock(return_value=res_page1)

    page1_items, next_cursor = await repo.list_by_snapshot_keyset(
        snapshot_id="snap-1", cursor=None, limit=10
    )

    assert len(page1_items) == 10
    assert next_cursor == mock_models[9].id

    # Second page: pass next_cursor, returns remaining 5 items (no lookahead beyond 5)
    res_page2 = MagicMock()
    res_page2.scalars.return_value.all.return_value = mock_models[10:15]
    session.execute = AsyncMock(return_value=res_page2)

    page2_items, next_cursor2 = await repo.list_by_snapshot_keyset(
        snapshot_id="snap-1", cursor=next_cursor, limit=10
    )

    assert len(page2_items) == 5
    assert next_cursor2 is None  # End of stream
