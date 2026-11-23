"""Asynchronous asset import job (pure domain, no I/O)."""

from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from typing import Any, Literal

from core.utils.id_generator import generate_ulid

ImportJobStatus = Literal["queued", "processing", "retrying", "succeeded", "failed"]
ImportJobSource = Literal["presigned", "direct"]
TERMINAL_STATUSES: frozenset[str] = frozenset({"succeeded", "failed"})


@dataclass(frozen=True)
class ImportItem:
    """One file already in storage, waiting to be validated and recorded."""

    asset_id: str
    filename: str
    storage_key: str
    sha256: str
    file_size: int
    mime_type: str | None = None
    metadata: dict[str, Any] | None = None
    data_format: str | None = None
    provenance: dict[str, Any] | None = None


@dataclass(frozen=True)
class ImportItemError:
    asset_id: str | None
    filename: str | None
    code: str
    message: str


@dataclass
class ImportJob:
    project_id: str
    version_id: str
    items: list[ImportItem]
    source: ImportJobSource = "presigned"
    created_by: int | None = None
    id: str = field(default_factory=generate_ulid)
    status: ImportJobStatus = "queued"
    attempt: int = 0
    new_assets_count: int = 0
    reused_assets_count: int = 0
    imported_asset_ids: list[str] = field(default_factory=list)
    errors: list[ImportItemError] = field(default_factory=list)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    finished_at: datetime | None = None

    @property
    def is_finished(self) -> bool:
        return self.status in TERMINAL_STATUSES

    def start_attempt(self, attempt: int) -> None:
        self.attempt = attempt
        self.status = "processing" if attempt <= 1 else "retrying"

    def succeed(self, imported_asset_ids: list[str], new_count: int, reused_count: int) -> None:
        self.status = "succeeded"
        self.imported_asset_ids = imported_asset_ids
        self.new_assets_count = new_count
        self.reused_assets_count = reused_count
        self.errors = []
        self.finished_at = datetime.now(UTC)

    def fail(self, errors: list[ImportItemError]) -> None:
        self.status = "failed"
        self.errors = errors
        self.imported_asset_ids = []
        self.new_assets_count = 0
        self.reused_assets_count = 0
        self.finished_at = datetime.now(UTC)

    def wait_for_retry(self, error: ImportItemError) -> None:
        self.status = "retrying"
        self.errors = [error]

    # --- serialization (stored as JSON) -------------------------------------

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["created_at"] = self.created_at.isoformat()
        data["finished_at"] = self.finished_at.isoformat() if self.finished_at else None
        return data

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ImportJob":
        return cls(
            id=data["id"],
            project_id=data["project_id"],
            version_id=data["version_id"],
            items=[ImportItem(**item) for item in data["items"]],
            source=data.get("source", "presigned"),
            created_by=data.get("created_by"),
            status=data["status"],
            attempt=data.get("attempt", 0),
            new_assets_count=data.get("new_assets_count", 0),
            reused_assets_count=data.get("reused_assets_count", 0),
            imported_asset_ids=list(data.get("imported_asset_ids", [])),
            errors=[ImportItemError(**err) for err in data.get("errors", [])],
            created_at=datetime.fromisoformat(data["created_at"]),
            finished_at=(
                datetime.fromisoformat(data["finished_at"]) if data.get("finished_at") else None
            ),
        )
