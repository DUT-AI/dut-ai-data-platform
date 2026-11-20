import random
from collections import Counter
from collections.abc import Sequence

from modules.snapshot.domain.interfaces import StratificationService
from modules.snapshot.domain.value_objects import SplitRatios


class DefaultStratificationService(StratificationService):
    """Pure-Python deterministic dataset splitting (random & iterative stratification)."""

    def assign_splits_random(
        self,
        asset_ids: Sequence[str],
        split_ratios: SplitRatios,
        seed: int | None = 42,
    ) -> dict[str, str]:
        rng = random.Random(seed)
        shuffled = list(asset_ids)
        rng.shuffle(shuffled)

        n = len(shuffled)
        n_train = round(n * split_ratios.train)
        n_val = round(n * split_ratios.validation)

        assignments: dict[str, str] = {}
        for aid in shuffled[:n_train]:
            assignments[aid] = "train"
        for aid in shuffled[n_train : n_train + n_val]:
            assignments[aid] = "validation"
        for aid in shuffled[n_train + n_val :]:
            assignments[aid] = "test"

        return assignments

    def assign_splits_stratified(
        self,
        asset_labels: dict[str, Sequence[str]],
        split_ratios: SplitRatios,
        seed: int | None = 42,
    ) -> dict[str, str]:
        """Multilabel iterative stratification following Sechidis et al. (2011).

        Guarantees class distribution balance across splits and deterministic seeded tie-breaking.
        """
        # 1. Separate unannotated (empty labels) from annotated assets
        unannotated = [aid for aid, labels in asset_labels.items() if not labels]
        annotated = [aid for aid, labels in asset_labels.items() if labels]

        assignments: dict[str, str] = {}

        # 2. Randomly/uniformly assign unannotated assets
        if unannotated:
            unannotated_assignments = self.assign_splits_random(
                unannotated, split_ratios, seed=seed
            )
            assignments.update(unannotated_assignments)

        if not annotated:
            return assignments

        # 3. Multilabel iterative stratification for annotated assets
        splits = ["train", "validation", "test"]
        ratios = {
            "train": split_ratios.train,
            "validation": split_ratios.validation,
            "test": split_ratios.test,
        }

        # Calculate total label frequencies across annotated dataset
        label_counts: Counter[str] = Counter()
        for aid in annotated:
            label_counts.update(set(asset_labels[aid]))

        # Target number of each label per split
        target_label_counts: dict[str, dict[str, float]] = {
            s: {lbl: count * ratios[s] for lbl, count in label_counts.items()}
            for s in splits
        }

        # Current allocated label counts per split
        current_label_counts: dict[str, Counter[str]] = {s: Counter() for s in splits}

        # Target item counts per split
        total_items = len(annotated)
        target_item_counts: dict[str, float] = {
            s: total_items * ratios[s] for s in splits
        }
        current_item_counts: Counter[str] = Counter()

        # Track unassigned assets and their remaining labels
        unassigned_assets = set(annotated)

        # Sort labels by rarity (least frequent first)
        sorted_labels = [
            lbl for lbl, _ in sorted(label_counts.items(), key=lambda x: (x[1], x[0]))
        ]

        for label in sorted_labels:
            # Find all unassigned assets with this label
            candidate_assets = [
                aid for aid in unassigned_assets if label in asset_labels[aid]
            ]
            if not candidate_assets:
                continue

            # Deterministic shuffle of candidates using seed and label
            candidate_rng = random.Random(f"{seed}:{label}")
            candidate_rng.shuffle(candidate_assets)

            # Prioritize candidates with fewer total remaining labels
            candidate_assets.sort(key=lambda aid: len(asset_labels[aid]))

            for aid in candidate_assets:
                if aid not in unassigned_assets:
                    continue

                # Find split with largest deficit for this label
                best_split = None
                max_deficit = -float("inf")

                for s in splits:
                    deficit = (
                        target_label_counts[s][label] - current_label_counts[s][label]
                    )
                    # Tie-breaking: prioritize split with fewer items relative to target
                    if deficit > max_deficit:
                        max_deficit = deficit
                        best_split = s
                    elif abs(deficit - max_deficit) < 1e-6:
                        # Secondary tie-break: item count deficit
                        item_deficit_curr = (
                            target_item_counts[s] - current_item_counts[s]
                        )
                        item_deficit_best = (
                            target_item_counts[best_split]
                            - current_item_counts[best_split]
                            if best_split
                            else -float("inf")
                        )
                        if item_deficit_curr > item_deficit_best:
                            best_split = s

                if best_split is None:
                    best_split = "train"

                # Assign item
                assignments[aid] = best_split
                unassigned_assets.remove(aid)
                current_item_counts[best_split] += 1
                for lbl in asset_labels[aid]:
                    current_label_counts[best_split][lbl] += 1

        # Fallback for any remaining unassigned assets
        if unassigned_assets:
            fallback = self.assign_splits_random(
                list(unassigned_assets), split_ratios, seed=seed
            )
            assignments.update(fallback)

        return assignments
