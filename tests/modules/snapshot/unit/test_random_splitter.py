from collections import Counter

from modules.snapshot.domain.services.stratification_service import (
    DefaultStratificationService,
)
from modules.snapshot.domain.value_objects import SplitRatios


def test_random_split_reproducibility():
    service = DefaultStratificationService()
    ratios = SplitRatios(train=0.70, validation=0.15, test=0.15)
    asset_ids = [f"asset_{i:04d}" for i in range(1000)]

    split_1 = service.assign_splits_random(asset_ids, ratios, seed=42)
    split_2 = service.assign_splits_random(asset_ids, ratios, seed=42)

    assert split_1 == split_2, (
        "Random splitting with same seed must be 100% deterministic"
    )

    # Different seed produces different shuffle
    split_diff_seed = service.assign_splits_random(asset_ids, ratios, seed=999)
    assert split_1 != split_diff_seed, (
        "Different seeds should produce different permutations"
    )


def test_random_split_counts_match_ratios():
    service = DefaultStratificationService()
    ratios = SplitRatios(train=0.70, validation=0.15, test=0.15)
    asset_ids = [f"asset_{i:04d}" for i in range(1000)]

    splits = service.assign_splits_random(asset_ids, ratios, seed=42)
    counts = Counter(splits.values())

    assert counts["train"] == 700
    assert counts["validation"] == 150
    assert counts["test"] == 150
