from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
import uuid


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all Domain Events in the application."""

    event_type: str
    aggregate_type: str
    aggregate_id: str
    payload: dict[str, Any]
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(frozen=True)
class DatasetCreatedEvent(DomainEvent):
    """Emitted when a new dataset aggregate is created."""

    def __init__(
        self,
        dataset_id: str,
        project_id: str,
        name: str,
        created_by: str | None = None,
    ) -> None:
        super().__init__(
            event_type="DatasetCreated",
            aggregate_type="Dataset",
            aggregate_id=dataset_id,
            payload={
                "dataset_id": dataset_id,
                "project_id": project_id,
                "name": name,
                "created_by": created_by,
            },
        )


@dataclass(frozen=True)
class DatasetVersionPublishedEvent(DomainEvent):
    """Emitted when a dataset version is published with canonical hash and asset composition."""

    def __init__(
        self,
        dataset_id: str,
        version_id: str,
        version_number: int | None,
        manifest_hash: str | None,
        asset_count: int,
    ) -> None:
        super().__init__(
            event_type="DatasetVersionPublished",
            aggregate_type="DatasetVersion",
            aggregate_id=version_id,
            payload={
                "dataset_id": dataset_id,
                "version_id": version_id,
                "version_number": version_number,
                "manifest_hash": manifest_hash,
                "asset_count": asset_count,
            },
        )


@dataclass(frozen=True)
class AssetReadyEvent(DomainEvent):
    """Emitted when an asset has been uploaded and finalized into the system."""

    def __init__(
        self,
        asset_id: str,
        project_id: str,
        filename: str,
        mime_type: str,
        file_size: int,
        sha256: str,
    ) -> None:
        super().__init__(
            event_type="AssetReady",
            aggregate_type="Asset",
            aggregate_id=asset_id,
            payload={
                "asset_id": asset_id,
                "project_id": project_id,
                "filename": filename,
                "mime_type": mime_type,
                "file_size": file_size,
                "sha256": sha256,
            },
        )
