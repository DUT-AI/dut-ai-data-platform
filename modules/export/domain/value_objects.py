from enum import Enum


class ExportStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ExportFormatType(str, Enum):
    CANONICAL_JSON = "canonical_json"
    CANONICAL_JSONL = "canonical_jsonl"
    YOLO = "yolo"
    COCO = "coco"
    CSV = "csv"


class MediaMode(str, Enum):
    LABELS_ONLY = "labels_only"
    FULL_BUNDLE = "full_bundle"
