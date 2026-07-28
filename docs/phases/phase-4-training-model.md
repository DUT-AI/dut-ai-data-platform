# Phase 4 — Training + Model Domain

> **Thời gian**: 6 tuần · **Team**: 5 devs  
> **Phụ thuộc**: Phase 3 (Snapshot + Export)  
> **Mục tiêu**: Trigger training job từ Snapshot, track experiment qua MLflow, tự động đăng ký Model Version khi training hoàn thành.

---

## 4A — Model Domain (Tuần 1–2)

### Database Tables

| Table | Columns chính | Ghi chú |
|-------|---------------|---------|
| `models` | id, project_id, name, description, task_type, status, created_at, updated_at | status: active/archived |
| `model_versions` | id, model_id, version, framework, task_type, artifact_uri, training_job_id, status, created_at | Immutable sau khi registered. status: draft/registered/deployed/archived |
| `model_artifacts` | id, version_id, artifact_type, uri, checksum, file_size | artifact_type: weights/config/tokenizer/onnx/... |
| `evaluation_results` | id, version_id, split, metric_name, metric_value, evaluated_at | split: val/test. metric: mAP, F1, CER, WER... |

### API Endpoints

| Method | Path | Mô tả | Quyền |
|--------|------|--------|-------|
| `POST` | `/api/v1/projects/{pid}/models` | Tạo model | Owner/Admin |
| `GET` | `/api/v1/projects/{pid}/models` | List models | Member |
| `GET` | `/api/v1/models/{id}` | Chi tiết model + versions | Member |
| `GET` | `/api/v1/model-versions/{vid}` | Chi tiết version + artifacts + metrics | Member |
| `GET` | `/api/v1/model-versions/{vid}/artifacts/{aid}/download` | Presigned download artifact | Member |
| `PUT` | `/api/v1/model-versions/{vid}/status` | Đổi status (deployed, archived) | Owner/Admin |
| `GET` | `/api/v1/model-versions/{vid}/evaluation` | List evaluation metrics | Member |
| `POST` | `/api/v1/model-versions/{vid}/evaluation` | Add evaluation result | System/Admin |

### Cần làm

- **Model Registry Service**: CRUD model, register model version, enforce immutability (version registered → không sửa artifact)
- **Model Lifecycle Management**: Draft → Registered → Deployed → Archived. Enforce rules (chỉ Registered mới được deploy)
- **Artifact Management**: upload model files → MinIO. Lưu URI + checksum. Hỗ trợ nhiều files per version (weights, config, labels...)
- **Evaluation Service**: store/retrieve metrics per version per split. So sánh metrics giữa các versions
- **Registry Provider Interface**: abstract layer cho external registries
- **MLflow Registry Adapter**: sync model version → MLflow Model Registry sau khi registered. Pull metrics từ MLflow về DB
- **Model Version Comparison**: query nhiều versions cùng lúc để compare metrics

### Frontend

- Model registry page: list models, create model
- Model detail: version list, version comparison table (metrics side-by-side)
- Model version detail: artifacts list, evaluation metrics (chart), training job link
- Deploy/Archive action buttons
- Artifact download links

---

## 4B — Training Domain (Tuần 3–6)

### Database Tables

| Table | Columns chính | Ghi chú |
|-------|---------------|---------|
| `training_jobs` | id, project_id, snapshot_id, model_id, name, framework, config (JSONB), status, created_by, created_at, started_at, completed_at | status: pending/running/completed/failed/cancelled |
| `experiments` | id, project_id, name, description, mlflow_experiment_id, created_at | Group training runs |
| `training_runs` | id, experiment_id, training_job_id, mlflow_run_id, status, started_at, completed_at | Map 1-1 với MLflow run |
| `training_metrics` | id, run_id, step, metric_name, metric_value, logged_at | Real-time metrics during training |
| `checkpoints` | id, run_id, epoch, uri, metrics (JSONB), created_at | Model checkpoints trong quá trình training |

### API Endpoints

| Method | Path | Mô tả | Quyền |
|--------|------|--------|-------|
| `POST` | `/api/v1/projects/{pid}/training-jobs` | Tạo + submit training job | Owner/Admin |
| `GET` | `/api/v1/projects/{pid}/training-jobs` | List training jobs | Member |
| `GET` | `/api/v1/training-jobs/{id}` | Chi tiết + status | Member |
| `DELETE` | `/api/v1/training-jobs/{id}` | Cancel job | Owner/Admin |
| `GET` | `/api/v1/training-jobs/{id}/metrics` | Metrics theo step | Member |
| `GET` | `/api/v1/training-jobs/{id}/checkpoints` | List checkpoints | Member |
| `POST` | `/api/v1/projects/{pid}/experiments` | Tạo experiment | Owner/Admin |
| `GET` | `/api/v1/projects/{pid}/experiments` | List experiments | Member |
| `GET` | `/api/v1/experiments/{id}/runs` | List runs trong experiment | Member |

### Cần làm

- **Training Job Service**: tạo job từ snapshot_id + config → validate snapshot tồn tại và ready → dispatch Celery task
- **Training Config**: flexible config JSONB (model architecture, hyperparameters, epochs, batch_size, learning_rate...)
- **Training Provider Interface**: abstract layer → `submit_job()`, `get_status()`, `cancel()`
- **Local Training Adapter** (Phase 4 ưu tiên):
  - Celery task thực sự chạy training script (subprocess hoặc trong-process)
  - Training script đọc Snapshot → prepare data → train → save checkpoints → log metrics → save final model
  - Script có thể là custom Python script theo từng framework (YOLO, PaddleOCR, HuggingFace Trainer...)
- **MLflow Integration**:
  - Tạo MLflow Experiment khi tạo experiment
  - Log params, metrics, artifacts lên MLflow trong quá trình training
  - Pull metrics từ MLflow về `training_metrics` table realtime
  - After completed → model artifact uploaded lên MLflow + MinIO
- **Training → Model Auto-Registration**: khi training completed → tự động tạo ModelVersion, upload artifacts, link training_job_id
- **Checkpoint Service**: lưu URI + metrics của mỗi checkpoint epoch
- **Metrics Streaming**: update `training_metrics` theo step → frontend polling để hiển thị real-time chart

### Training Data Preparation

Training script cần:
1. Đọc Snapshot từ DB → lấy danh sách (asset_uri, annotation_revision_id, split)
2. Download assets từ MinIO (hoặc dùng presigned URL)
3. Load annotation revisions → convert sang format của framework (YOLO, COCO...)
4. Run training loop
5. Log metrics mỗi epoch → update DB
6. Save checkpoint mỗi N epochs → upload MinIO → insert checkpoint record
7. Final model → upload MinIO → trigger Model registration

### Frontend

- Training jobs list: status badges, duration, framework
- Create training job: chọn snapshot, experiment, config form (framework-specific)
- Training job detail:
  - Real-time metrics chart (loss, accuracy... theo epoch) — polling every 5s
  - Checkpoint list
  - Log output (tail logs)
  - Cancel button (khi running)
- Experiment page: group runs, compare metrics across runs
- MLflow link: direct link tới MLflow UI (nếu cần debug detail)

---

## Phân công (6 tuần × 5 devs)

| Tuần | Dev 1 | Dev 2 | Dev 3 | Dev 4 | Dev 5 (Frontend) |
|------|-------|-------|-------|-------|-------------------|
| **1** | Model model + repo + service | Model Version lifecycle | Artifact management + MinIO | Evaluation service | Model registry UI |
| **2** | MLflow Registry Adapter | Model API router + tests | Model version comparison | Metrics query | Model version detail + metrics chart |
| **3** | Training Job model + service | Experiment + Run models | Training Provider interface | Local Training Adapter scaffold | Training job list + create form |
| **4** | MLflow integration (log params/metrics) | Training script: data prep từ Snapshot | Training script: YOLO training | Checkpoint service | Real-time metrics chart (polling) |
| **5** | Training → Model auto-registration | Training script: HuggingFace trainer | MLflow run sync | Training API router + tests | Experiment page + run comparison |
| **6** | Integration tests (Snapshot → Train → Model) | Cancel job + cleanup | Performance + stability | API review | Log viewer + checkpoint UI |

---

## Acceptance Criteria

### Model Domain
- [ ] CRUD Model + Model Version
- [ ] Model Version immutable sau khi registered
- [ ] Upload model artifacts → MinIO → presigned download
- [ ] Store evaluation metrics per split
- [ ] Model version comparison (metrics side-by-side)
- [ ] MLflow sync: model đăng ký trong MLflow Registry

### Training Domain
- [ ] Submit training job từ Snapshot
- [ ] Training chạy async → metrics logged realtime
- [ ] MLflow: experiment + run + params + metrics + artifacts
- [ ] Checkpoint saved per epoch
- [ ] Training completed → Model Version auto-created
- [ ] Cancel training job hoạt động
- [ ] Frontend real-time metrics chart (polling)
