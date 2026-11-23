"""Local development: start ASSET_IMPORT_WORKERS validation worker processes.

    uv run python -m apps.validation_worker.run_many          # uses ASSET_IMPORT_WORKERS (4)
    uv run python -m apps.validation_worker.run_many 2        # explicit count

Ctrl+C stops all of them. In Docker, scale the compose service instead.
"""

import subprocess
import sys

from core.config import asset_import_settings

WORKER_COMMAND = [sys.executable, "-m", "arq", "apps.validation_worker.main.WorkerSettings"]


def main() -> int:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else asset_import_settings.asset_import_workers
    processes = [subprocess.Popen(WORKER_COMMAND) for _ in range(count)]
    print(f"Started {count} validation worker process(es). Ctrl+C to stop.")
    try:
        return max(p.wait() for p in processes)
    except KeyboardInterrupt:
        for p in processes:
            p.terminate()
        for p in processes:
            p.wait()
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
