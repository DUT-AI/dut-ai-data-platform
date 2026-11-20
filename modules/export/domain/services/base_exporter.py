from dataclasses import dataclass, field
from typing import Any, Protocol

from modules.export.domain.interfaces import (
    SnapshotExportContext,
    SnapshotItemExportData,
)


@dataclass
class ExportArtifact:
    relative_path: str
    content: bytes | str
    is_media: bool = False
    source_asset_id: str = ""
    source_annotation_revision_id: str | None = None
    split: str = "default"
    metadata: dict[str, Any] = field(default_factory=dict)


class IFormatExporter(Protocol):
    """Protocol governing format-specific dataset transformations."""

    def __init__(
        self, context: SnapshotExportContext, target_output_id: str | None = None
    ) -> None: ...

    def export_item(self, item: SnapshotItemExportData) -> list[ExportArtifact]:
        """Transform a single snapshot item into format-specific artifacts."""
        ...

    def generate_extra_files(self) -> list[ExportArtifact]:
        """Generate format-level configuration, classes, or dataset index files."""
        ...
