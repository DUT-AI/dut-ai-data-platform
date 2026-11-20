from dataclasses import dataclass
from enum import Enum


class SnapshotStatus(str, Enum):
    CREATING = "CREATING"
    READY = "READY"
    ARCHIVED = "ARCHIVED"
    FAILED = "FAILED"


class SelectionPolicy(str, Enum):
    LATEST_APPROVED = "LATEST_APPROVED"
    LATEST_SUBMITTED = "LATEST_SUBMITTED"


class SplitStrategy(str, Enum):
    RANDOM = "RANDOM"
    STRATIFIED = "STRATIFIED"


class SplitType(str, Enum):
    TRAIN = "train"
    VALIDATION = "validation"
    TEST = "test"


class DiffChangeType(str, Enum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    SPLIT_CHANGED = "split_changed"


@dataclass(frozen=True)
class SplitRatios:
    train: float = 0.70
    validation: float = 0.15
    test: float = 0.15

    def validate(self) -> None:
        if self.train < 0 or self.validation < 0 or self.test < 0:
            raise ValueError("Split ratios must be non-negative")
        total = round(self.train + self.validation + self.test, 4)
        if total != 1.0:
            raise ValueError(f"Split ratios must sum to 1.0 (got {total})")

    def to_dict(self) -> dict[str, float]:
        return {
            "train": self.train,
            "validation": self.validation,
            "test": self.test,
        }
