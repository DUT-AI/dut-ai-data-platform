import hashlib
import io
import mimetypes
from typing import Any

from loguru import logger


class AssetMetadataExtractor:
    """Extract file SHA256 checksum and metadata (width, height, page count, etc.)."""

    @staticmethod
    def calculate_sha256(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def extract_metadata(
        filename: str, content: bytes, mime_type: str | None = None
    ) -> tuple[str, dict[str, Any]]:
        # 1. Determine MIME type
        if not mime_type or mime_type == "application/octet-stream":
            guessed, _ = mimetypes.guess_type(filename)
            mime_type = guessed or "application/octet-stream"

        metadata: dict[str, Any] = {
            "file_size": len(content),
            "filename": filename,
        }

        # 2. Try Image Metadata Extraction via Pillow if available
        if mime_type.startswith("image/"):
            try:
                from PIL import Image

                with Image.open(io.BytesIO(content)) as img:
                    metadata["width"] = img.width
                    metadata["height"] = img.height
                    metadata["format"] = img.format
                    metadata["mode"] = img.mode
            except Exception as e:
                logger.debug(f"Failed to extract image metadata for {filename}: {e}")

        # 3. Try PDF Page Count Extraction if available
        elif mime_type == "application/pdf":
            try:
                import pypdf

                reader = pypdf.PdfReader(io.BytesIO(content))
                metadata["page_count"] = len(reader.pages)
            except Exception as e:
                logger.debug(f"Failed to extract PDF metadata for {filename}: {e}")

        return mime_type, metadata
