import csv
import hashlib
import io
import json
import mimetypes
from typing import Any

from loguru import logger


class AssetMetadataExtractor:
    """Extract file SHA256 checksum and metadata for Image, Audio, Video, Tabular (CSV/JSONL), and Text assets."""

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

        if not content:
            return mime_type, metadata

        fname_lower = filename.lower()

        # 2. Image Metadata Extraction & Validation (Pillow)
        if mime_type.startswith("image/") or fname_lower.endswith(
            (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".tiff")
        ):
            try:
                from PIL import Image

                with Image.open(io.BytesIO(content)) as img:
                    img.verify()
                with Image.open(io.BytesIO(content)) as img:
                    metadata["width"] = img.width
                    metadata["height"] = img.height
                    metadata["format"] = img.format
                    metadata["mode"] = img.mode
            except Exception as e:
                logger.warning(
                    f"Corrupted or invalid image file detected ({filename}): {e}"
                )
                raise ValueError(
                    f"Tập tin hình ảnh '{filename}' bị hỏng hoặc không đúng định dạng."
                ) from e

        # 3. Audio Metadata Extraction (WAV / Standard Wave)
        elif mime_type.startswith("audio/"):
            try:
                if fname_lower.endswith(".wav") or mime_type in (
                    "audio/wav",
                    "audio/x-wav",
                ):
                    import wave

                    with wave.open(io.BytesIO(content), "rb") as wav_file:
                        n_channels = wav_file.getnchannels()
                        framerate = wav_file.getframerate()
                        n_frames = wav_file.getnframes()
                        metadata["channels"] = n_channels
                        metadata["sample_rate"] = framerate
                        metadata["duration_seconds"] = (
                            round(n_frames / float(framerate), 2) if framerate else 0
                        )
            except Exception as e:
                logger.debug(f"Failed to extract audio metadata for {filename}: {e}")

        # 4. Video Metadata Extraction (OpenCV if available)
        elif mime_type.startswith("video/"):
            try:
                import tempfile
                import cv2

                ext = fname_lower.split(".")[-1] if "." in fname_lower else "mp4"
                with tempfile.NamedTemporaryFile(
                    suffix=f".{ext}", delete=True
                ) as tmp:
                    tmp.write(content)
                    tmp.flush()
                    cap = cv2.VideoCapture(tmp.name)
                    if cap.isOpened():
                        metadata["width"] = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                        metadata["height"] = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                        fps = round(cap.get(cv2.CAP_PROP_FPS), 2)
                        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
                        metadata["fps"] = fps
                        metadata["frame_count"] = frame_count
                        if fps > 0:
                            metadata["duration_seconds"] = round(
                                frame_count / fps, 2
                            )
                        cap.release()
            except Exception as e:
                logger.debug(f"Failed to extract video metadata for {filename}: {e}")

        # 5. Tabular Data (CSV / TSV)
        elif mime_type in (
            "text/csv",
            "text/tab-separated-values",
        ) or fname_lower.endswith((".csv", ".tsv")):
            try:
                text = content.decode("utf-8", errors="ignore")
                lines = [line for line in text.splitlines() if line.strip()]
                metadata["line_count"] = len(lines)
                if lines:
                    delimiter = "\t" if fname_lower.endswith(".tsv") else ","
                    reader = csv.reader(lines, delimiter=delimiter)
                    header = next(reader, None)
                    if header:
                        metadata["column_count"] = len(header)
                        metadata["headers"] = header[:20]
                        metadata["row_count"] = max(0, len(lines) - 1)
            except Exception as e:
                logger.debug(f"Failed to extract CSV metadata for {filename}: {e}")

        # 6. JSON / JSONL Data
        elif mime_type in (
            "application/json",
            "application/x-ndjson",
        ) or fname_lower.endswith((".json", ".jsonl")):
            try:
                text = content.decode("utf-8", errors="ignore")
                if fname_lower.endswith(".jsonl") or mime_type == "application/x-ndjson":
                    lines = [l for l in text.splitlines() if l.strip()]
                    metadata["row_count"] = len(lines)
                    if lines:
                        first_item = json.loads(lines[0])
                        if isinstance(first_item, dict):
                            metadata["keys"] = list(first_item.keys())[:20]
                else:
                    data = json.loads(text)
                    if isinstance(data, list):
                        metadata["item_count"] = len(data)
                        if data and isinstance(data[0], dict):
                            metadata["keys"] = list(data[0].keys())[:20]
                    elif isinstance(data, dict):
                        metadata["keys"] = list(data.keys())[:20]
            except Exception as e:
                logger.debug(f"Failed to extract JSON metadata for {filename}: {e}")

        # 7. Text Document (TXT, MD)
        elif mime_type.startswith("text/") or fname_lower.endswith((".txt", ".md")):
            try:
                text = content.decode("utf-8", errors="ignore")
                lines = text.splitlines()
                words = text.split()
                metadata["line_count"] = len(lines)
                metadata["word_count"] = len(words)
                metadata["char_count"] = len(text)
            except Exception as e:
                logger.debug(f"Failed to extract text metadata for {filename}: {e}")

        return mime_type, metadata
