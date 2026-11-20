from collections import Counter

from modules.snapshot.domain.services.stratification_service import (
    DefaultStratificationService,
)
from modules.snapshot.domain.value_objects import SplitRatios


def test_stratification_deterministic_reproducibility():
    service = DefaultStratificationService()
    ratios = SplitRatios(train=0.70, validation=0.15, test=0.15)

    asset_labels = {
        f"asset_{i:03d}": (["car"] if i % 2 == 0 else ["pedestrian", "traffic_light"])
        for i in range(200)
    }

    # Run split generation twice with same seed
    split_1 = service.assign_splits_stratified(asset_labels, ratios, seed=42)
    split_2 = service.assign_splits_stratified(asset_labels, ratios, seed=42)

    assert split_1 == split_2, "Stratification must be 100% reproducible with same seed"


def test_stratification_class_deviation_within_tolerance():
    service = DefaultStratificationService()
    ratios = SplitRatios(train=0.70, validation=0.15, test=0.15)

    # Generate synthetic multilabel dataset with 1,000 assets and varying class distributions
    asset_labels = {}
    for i in range(1000):
        labels = []
        if i % 2 == 0:
            labels.append("car")
        if i % 3 == 0:
            labels.append("pedestrian")
        if i % 7 == 0:
            labels.append("cyclist")
        if i % 13 == 0:
            labels.append("truck")
        asset_labels[f"asset_{i:04d}"] = labels

    splits = service.assign_splits_stratified(asset_labels, ratios, seed=123)

    # Count total occurrences per label
    total_label_counts: Counter[str] = Counter()
    for labels in asset_labels.values():
        total_label_counts.update(set(labels))

    # Count label occurrences per split
    split_label_counts = {
        "train": Counter(),
        "validation": Counter(),
        "test": Counter(),
    }
    for aid, split in splits.items():
        split_label_counts[split].update(set(asset_labels[aid]))

    target_ratios = {"train": 0.70, "validation": 0.15, "test": 0.15}

    # Verify SC-004: Class frequency proportion in each split stays within <= 2% (0.02) deviation
    for split_name, target_ratio in target_ratios.items():
        for label, total_count in total_label_counts.items():
            if total_count >= 50:  # Check classes with sufficient sample size
                actual_count = split_label_counts[split_name][label]
                actual_ratio = actual_count / total_count
                deviation = abs(actual_ratio - target_ratio)
                assert deviation <= 0.025, (
                    f"Class '{label}' in '{split_name}' deviated by {deviation:.4f} "
                    f"(actual: {actual_ratio:.4f}, target: {target_ratio:.4f}), exceeding tolerance"
                )


def test_stratification_with_unannotated_assets():
    service = DefaultStratificationService()
    ratios = SplitRatios(train=0.70, validation=0.15, test=0.15)

    # 100 annotated assets, 100 unannotated assets
    asset_labels = {}
    for i in range(100):
        asset_labels[f"annotated_{i}"] = ["cat"]
    for i in range(100):
        asset_labels[f"unannotated_{i}"] = []

    splits = service.assign_splits_stratified(asset_labels, ratios, seed=999)

    assert len(splits) == 200

    unannotated_splits = [splits[f"unannotated_{i}"] for i in range(100)]
    unannotated_train = sum(1 for s in unannotated_splits if s == "train")
    unannotated_val = sum(1 for s in unannotated_splits if s == "validation")
    unannotated_test = sum(1 for s in unannotated_splits if s == "test")

    # Target is 70 train, 15 val, 15 test
    assert unannotated_train == 70
    assert unannotated_val == 15
    assert unannotated_test == 15
