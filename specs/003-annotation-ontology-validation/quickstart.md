# Quickstart: validate the feature

## Prerequisites

- Python venv: `uv sync` (or the existing `.venv`).
- Web dependencies: `cd web && pnpm install` (or npm).

## 1. The app boots

```bash
.venv/Scripts/python.exe -c "import apps.api.main; print('ok')"   # Windows
.venv/bin/python -c "import apps.api.main; print('ok')"           # Linux/macOS
```

Expected output: `ok`.

## 2. Rule and API tests

```bash
python -m pytest -q tests/unit/test_annotation_result_validation.py \
  tests/test_annotation_validator_unit.py \
  tests/test_tabular_annotation_format.py \
  tests/test_annotation_full.py
```

Expected: all pass. `test_annotation_full.py` covers these cases end to end:

- a polygon on a bbox-only version plus an unknown category → `400`, with `details.issues` codes `["unknown_output", "category_not_allowed"]`, and nothing persisted;
- a version used from another project → `404`;
- valid create, then revision, then Label Studio sync (revision 3, label key `car` stored as the category id);
- a Label Studio label outside the ontology → `200 null`, no new revision.

## 3. Manual check in the workspace

1. Create a project and an ontology with an Image input and a Bounding Box output linked to two categories. **Publish** it.
2. Open an asset in the annotation workspace and draw a box with no category selected. Save. The red banner shows `Kết quả #1: cần chọn Category.`
3. Pick a category and save. The blue banner shows success.
4. Create a new draft version and open the workspace with `?ontologyVersionId=<draft id>`. Save. The banner asks you to publish first, and no request is sent.

## 4. Frontend gate

Run from `web/`:

```bash
npx prettier --check src/features/annotation/utils/api-error.ts src/features/annotation/components/annotation-workspace-view.tsx
npx eslint src/features/annotation/utils/api-error.ts src/features/annotation/components/annotation-workspace-view.tsx
npx tsc --noEmit
npx next build
```
