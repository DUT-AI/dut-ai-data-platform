import random

from modules.snapshot.domain.services.checksum_service import (
    DefaultChecksumService,
)


def test_item_checksum_deterministic():
    service = DefaultChecksumService()

    chk1 = service.compute_item_checksum(
        asset_id="asset_01",
        asset_checksum="hash_abc_123",
        annotation_revision_id="rev_01",
        split="train",
    )
    chk2 = service.compute_item_checksum(
        asset_id="asset_01",
        asset_checksum="hash_abc_123",
        annotation_revision_id="rev_01",
        split="train",
    )

    assert len(chk1) == 64
    assert chk1 == chk2, "Item checksum must be deterministic"


def test_item_checksum_unannotated_asset():
    service = DefaultChecksumService()

    chk_unannotated = service.compute_item_checksum(
        asset_id="asset_02",
        asset_checksum="hash_def_456",
        annotation_revision_id=None,
        split="test",
    )

    assert len(chk_unannotated) == 64


def test_aggregate_checksum_order_independence():
    service = DefaultChecksumService()

    item_checksums = [
        service.compute_item_checksum(f"aid_{i}", f"h_{i}", f"rev_{i}", "train")
        for i in range(50)
    ]

    # Compute aggregate with original order
    agg_1 = service.compute_aggregate_checksum(item_checksums)

    # Shuffle the list
    shuffled = list(item_checksums)
    random.Random(42).shuffle(shuffled)
    agg_2 = service.compute_aggregate_checksum(shuffled)

    # Reverse the list
    reversed_list = list(reversed(item_checksums))
    agg_3 = service.compute_aggregate_checksum(reversed_list)

    assert agg_1 == agg_2 == agg_3, (
        "Aggregate checksum must be order-independent via sorted concatenation"
    )
    assert len(agg_1) == 64
