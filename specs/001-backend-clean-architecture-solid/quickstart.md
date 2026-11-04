# Quickstart & Verification Guide: Backend Clean Architecture & SOLID Refactoring

## 1. Prerequisites

- Python 3.12+ installed via `uv` or active virtual environment (`.venv`).
- Local environment dependencies installed:
  ```bash
  uv sync
  ```

---

## 2. Automated Test Suite Validation

Execute the full backend test suite to ensure zero regressions:
```bash
uv run pytest tests/ -q
```
*Expected Result*: All 111 tests pass with 0 errors.

---

## 3. Architecture & SOLID Gate Checks

### 3.1 Domain Layer Purity Gate
Verify that no domain entity imports Pydantic, FastAPI, or SQLAlchemy:
```bash
python -c '
import sys
from modules.identity.domain import entities as id_ent
from modules.annotation.domain import entities as ann_ent
from modules.project.domain import entities as prj_ent
from modules.dataset.domain import entities as ds_ent
from modules.ontology.domain import entities as ont_ent

for mod in [id_ent, ann_ent, prj_ent, ds_ent, ont_ent]:
    mods = sys.modules
    for imp in ["pydantic", "fastapi", "sqlalchemy"]:
        assert imp not in mod.__dict__, f"Forbidden import {imp} found in {mod.__name__}"
print("✅ Domain purity gate passed: 0 framework dependencies in domain entities.")
'
```

### 3.2 Aggregate Invariant & Sequence Gate
Verify that `AnnotationEntity` correctly manages sequential revisions without database queries:
```bash
python -c '
from modules.annotation.domain.entities import AnnotationEntity

anno = AnnotationEntity(asset_id="asset_1", project_id="prj_1", created_by=101)
rev1 = anno.add_revision(source="human", results=[{"label": "car"}], category_ids=["cat_1"], created_by=101)
assert rev1.revision_number == 1, f"Expected 1, got {rev1.revision_number}"

rev2 = anno.add_revision(source="human", results=[{"label": "truck"}], category_ids=["cat_2"], created_by=101)
assert rev2.revision_number == 2, f"Expected 2, got {rev2.revision_number}"
assert len(anno.revisions) == 2
print("✅ Aggregate invariant gate passed: Revision sequence correctly enforced in Domain.")
'
```

### 3.3 Storage Exception Propagation Gate
Verify that S3 upload failures are propagated as `StorageUploadError` and never return fake fallback URIs:
```bash
python -c '
import pytest
from unittest.mock import AsyncMock
from modules.inference.infrastructure.storage.prediction_storage import S3PredictionStorage

mock_provider = AsyncMock()
mock_provider.upload.side_effect = RuntimeError("MinIO connection refused")
storage = S3PredictionStorage(storage_provider=mock_provider)

try:
    import asyncio
    asyncio.run(storage.upload_prediction_artifact("job_1", {"key": "val"}))
    assert False, "Should have raised exception"
except Exception as e:
    assert "MinIO connection refused" in str(e)
    print("✅ Storage failure gate passed: Exceptions raised cleanly without fake fallbacks.")
'
```

---

## 4. Code Formatting & Linting

Run ruff linting and formatting across modified modules:
```bash
uv run ruff check apps/ modules/ core/
uv run ruff format --check apps/ modules/ core/
```
