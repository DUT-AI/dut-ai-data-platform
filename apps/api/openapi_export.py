"""Write the FastAPI OpenAPI document to a file without starting the server.

The frontend generates its API types from this file (see specs/004-api-contract-typegen).

Usage: uv run python -m apps.api.openapi_export web/openapi.json
"""

import json
import sys
from pathlib import Path

from apps.api.main import app


def main() -> None:
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "web/openapi.json")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"OpenAPI written to {target}")


if __name__ == "__main__":
    main()
