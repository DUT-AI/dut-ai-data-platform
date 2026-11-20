import hashlib
import json
from collections.abc import Sequence

from modules.snapshot.domain.interfaces import ChecksumService


class DefaultChecksumService(ChecksumService):
    """Deterministic SHA-256 Checksum Service conforming to RFC 8785 Canonical JSON."""

    def compute_item_checksum(
        self,
        asset_id: str,
        asset_checksum: str,
        annotation_revision_id: str | None,
        split: str,
    ) -> str:
        payload = {
            "annotation_revision_id": annotation_revision_id,
            "asset_checksum": asset_checksum,
            "asset_id": asset_id,
            "split": split,
        }
        canonical_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    def compute_aggregate_checksum(self, item_checksums: Sequence[str]) -> str:
        sorted_checksums = sorted(item_checksums)
        digest_bytes = "\n".join(sorted_checksums).encode("utf-8")
        return hashlib.sha256(digest_bytes).hexdigest()
