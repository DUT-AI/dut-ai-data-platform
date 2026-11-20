#!/usr/bin/env python3
"""
CLI Tool for P2P Dataset Transfer in DUT AI Data Platform.
Streams large datasets (5-20 GB+) directly to/from S3 (MinIO) via Tailscale WireGuard mesh,
coordinating upload preparation and finalization through the main Platform API.
"""

import argparse
import contextlib
import hashlib
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


def _load_env_file() -> None:
    """Auto-load variables from .env file if present without external dependencies."""
    search_dirs = [
        Path.cwd(),
        Path(__file__).resolve().parent.parent.parent,
    ]
    for directory in search_dirs:
        env_file = directory / ".env"
        if env_file.is_file():
            with contextlib.suppress(Exception):
                with open(env_file, encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip("'\"")
                            if key not in os.environ:
                                os.environ[key] = val
                break

_load_env_file()

DEFAULT_API_BASE_URL = os.getenv(
    "API_BASE_URL",
    os.getenv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:8000/api/v1")
)


def format_size(bytes_val: float) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f} PB"


class ProgressFileReader:
    """Wraps a file object to report upload progress and compute SHA256 on the fly without loading all bytes to RAM."""

    def __init__(self, filename: str, total_size: int):
        self._f = open(filename, "rb")  # noqa: SIM115
        self._total = total_size
        self._read = 0
        self._last_print = 0
        self._start_time = time.time()
        self.hasher = hashlib.sha256()

    def read(self, size: int = -1) -> bytes:
        chunk = self._f.read(size)
        if chunk:
            self.hasher.update(chunk)
            self._read += len(chunk)

        now = time.time()
        if now - self._last_print >= 0.5 or self._read == self._total:
            percent = (self._read / self._total) * 100 if self._total > 0 else 100
            elapsed = now - self._start_time
            speed = (self._read / elapsed) if elapsed > 0 else 0
            eta = (self._total - self._read) / speed if speed > 0 else 0
            print(
                f"\r   ⏳ Tải lên: {percent:6.2f}% | "
                f"{format_size(self._read)}/{format_size(self._total)} | "
                f"{format_size(speed)}/s | ETA: {eta:.0f}s",
                end="",
                flush=True,
            )
            self._last_print = now

        return chunk

    def __len__(self) -> int:
        return self._total

    def close(self) -> None:
        self._f.close()


def upload_asset(
    api_base_url: str,
    version_id: str,
    file_path: str,
    auth_token: str | None = None,
    content_type: str = "application/octet-stream",
) -> None:
    if not os.path.exists(file_path):
        print(f"❌ Lỗi: File '{file_path}' không tồn tại!")
        sys.exit(1)

    file_size = os.path.getsize(file_path)
    file_name = os.path.basename(file_path)
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    print(f"\n📦 Chuẩn bị upload asset: {file_name} ({format_size(file_size)})")
    print(f"📡 [1/3] Gọi API xin Presigned Upload URL ({api_base_url})...")

    prepare_payload = json.dumps(
        {
            "files": [
                {
                    "filename": file_name,
                    "content_type": content_type,
                    "file_size": file_size,
                }
            ]
        }
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{api_base_url.rstrip('/')}/dataset-versions/{version_id}/prepare-upload",
        data=prepare_payload,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            res_data = json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"❌ Lỗi gọi prepare-upload: {e}")
        sys.exit(1)

    items = res_data.get("items", [])
    if not items:
        print("❌ Không nhận được Presigned URL từ server!")
        sys.exit(1)

    item = items[0]
    asset_id = item["asset_id"]
    storage_key = item["storage_key"]
    upload_url = item["upload_url"]

    print("✅ Đã nhận S3 Presigned URL.")
    print(f"🔑 Asset ID: {asset_id}")
    print(f"📂 Storage Key: {storage_key}")

    # 2. Upload trực tiếp S3
    print("🚀 [2/3] Bắt đầu stream dữ liệu P2P trực tiếp lên S3 MinIO...")
    reader = ProgressFileReader(file_path, file_size)
    put_req = urllib.request.Request(
        upload_url,
        data=reader,
        headers={"Content-Length": str(file_size), "Content-Type": content_type},
        method="PUT",
    )

    start_upload = time.time()
    try:
        with urllib.request.urlopen(put_req, timeout=86400) as s3_res:
            reader.close()
            if s3_res.status not in (200, 204):
                print(f"\n❌ S3 trả về mã lỗi: {s3_res.status}")
                sys.exit(1)
    except Exception as e:
        reader.close()
        print(f"\n❌ Lỗi upload S3: {e}")
        sys.exit(1)

    elapsed = time.time() - start_upload
    avg_speed = file_size / elapsed if elapsed > 0 else 0
    calculated_sha256 = reader.hasher.hexdigest()
    print(
        f"\n✅ Upload S3 thành công trong {elapsed:.1f}s (Tốc độ TB: {format_size(avg_speed)}/s)!"
    )
    print(f"🔒 SHA256: {calculated_sha256}")

    # 3. Finalize import
    print("📩 [3/3] Báo hoàn tất về Server để kích hoạt Validation Worker...")
    finalize_payload = json.dumps(
        {
            "items": [
                {
                    "asset_id": asset_id,
                    "storage_key": storage_key,
                    "filename": file_name,
                    "mime_type": content_type,
                    "file_size": file_size,
                    "sha256": calculated_sha256,
                }
            ]
        }
    ).encode("utf-8")

    fin_req = urllib.request.Request(
        f"{api_base_url.rstrip('/')}/dataset-versions/{version_id}/finalize-import",
        data=finalize_payload,
        headers=headers,
        method="POST",
    )

    try:
        with urllib.request.urlopen(fin_req, timeout=30) as fin_res:
            fin_data = json.loads(fin_res.read().decode("utf-8"))
            print("🎉 Hoàn tất xác nhận Asset trên Server!")
            print(f"   Imported assets: {len(fin_data.get('imported_assets', []))}")
            print("   Event đã được gửi vào hàng đợi xử lý của Worker.")
    except Exception as e:
        print(f"⚠️ Cảnh báo: File đã lên S3 nhưng lỗi xác nhận finalize-import: {e}")


def download_asset(
    api_base_url: str,
    asset_id: str,
    output_path: str | None = None,
    auth_token: str | None = None,
) -> None:
    headers = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    print(f"\n📥 Yêu cầu download asset: {asset_id}")
    print(f"📡 [1/2] Đang xin Presigned Download URL ({api_base_url})...")

    req = urllib.request.Request(
        f"{api_base_url.rstrip('/')}/assets/{asset_id}/download",
        headers=headers,
        method="GET",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            res_data = json.loads(res.read().decode("utf-8"))
    except Exception as e:
        print(f"❌ Không thể lấy URL download: {e}")
        sys.exit(1)

    download_url = res_data["download_url"]
    filename = res_data.get("filename") or f"{asset_id}.bin"
    target_path = output_path or filename

    print("✅ Đã nhận S3 Download URL.")
    print(f"🚀 [2/2] Bắt đầu stream dữ liệu P2P từ S3 về '{target_path}'...")

    start_dl = time.time()
    downloaded = 0
    last_print = 0

    try:
        with urllib.request.urlopen(download_url, timeout=86400) as s3_res, open(
            target_path, "wb"
        ) as f_out:
            total_size = int(s3_res.headers.get("Content-Length", 0))
            while True:
                chunk = s3_res.read(8 * 1024 * 1024)  # 8MB chunk buffer
                if not chunk:
                    break
                f_out.write(chunk)
                downloaded += len(chunk)

                now = time.time()
                if now - last_print >= 0.5 or downloaded == total_size:
                    percent = (
                        (downloaded / total_size) * 100 if total_size > 0 else 100
                    )
                    elapsed = now - start_dl
                    speed = (downloaded / elapsed) if elapsed > 0 else 0
                    eta = (total_size - downloaded) / speed if speed > 0 else 0
                    print(
                        f"\r   ⏳ Đang tải về: {percent:6.2f}% | "
                        f"{format_size(downloaded)}/{format_size(total_size)} | "
                        f"{format_size(speed)}/s | ETA: {eta:.0f}s",
                        end="",
                        flush=True,
                    )
                    last_print = now
    except Exception as e:
        print(f"\n❌ Lỗi download từ S3: {e}")
        sys.exit(1)

    elapsed_total = time.time() - start_dl
    avg_speed = downloaded / elapsed_total if elapsed_total > 0 else 0
    print(
        f"\n🎉 Tải về hoàn tất: '{target_path}' trong {elapsed_total:.1f}s (Tốc độ TB: {format_size(avg_speed)}/s)!"
    )


def main():
    parser = argparse.ArgumentParser(
        description="DUT AI Data Platform - P2P Dataset Transfer Tool"
    )
    parser.add_argument(
        "--api-url",
        default=DEFAULT_API_BASE_URL,
        help="Base URL của API (mặc định: http://localhost:8000/api/v1)",
    )
    parser.add_argument("--token", default=None, help="JWT Bearer Token nếu có")

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Upload subparser
    up_parser = subparsers.add_parser(
        "upload", help="Upload dataset asset lên một Dataset Version"
    )
    up_parser.add_argument(
        "--version-id", required=True, help="ID của Dataset Version (Draft)"
    )
    up_parser.add_argument("file", help="Đường dẫn file dataset cần tải lên")
    up_parser.add_argument(
        "--content-type",
        default="application/octet-stream",
        help="MIME content-type của file",
    )

    # Download subparser
    down_parser = subparsers.add_parser("download", help="Download asset từ S3")
    down_parser.add_argument("asset_id", help="ID của Asset cần tải về")
    down_parser.add_argument(
        "-o", "--output", default=None, help="Tên file hoặc đường dẫn lưu file tải về"
    )

    args = parser.parse_args()

    if args.command == "upload":
        upload_asset(
            args.api_url,
            args.version_id,
            args.file,
            auth_token=args.token,
            content_type=args.content_type,
        )
    elif args.command == "download":
        download_asset(
            args.api_url, args.asset_id, output_path=args.output, auth_token=args.token
        )


if __name__ == "__main__":
    main()
