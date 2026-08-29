# Checkpoint 2 — Last Login Persistence Report

## 1. Requirement

Mentor yêu cầu:
> Lưu lại thời điểm user đăng nhập Data Platform lần cuối (`last_login_at`).
> Thời điểm này là lúc user đăng nhập thành công vào DUT AI Data Platform gần nhất.
> Không ghi nhận khi gọi `/me`, refresh token, request API khác, hay khi đăng nhập thất bại.

---

## 2. Existing Auth Flow & Integration

* **Luồng đăng nhập**:
  1. Frontend gọi `POST /api/v1/auth/login` kèm `email` và `password`.
  2. `LoginUseCase` gọi `AuthClient.login(email, password)` tới External Auth Server.
  3. External Auth Server trả về `TokenResponse(access_token, refresh_token, token_type)`.
  4. `LoginUseCase` gọi `AuthClient.get_me(access_token)` để resolve thông tin user (lấy `user.id`).
  5. `LoginUseCase` gọi `IUserLoginRepository.upsert_last_login(user_id=str(user.id), last_login_at=datetime.now(UTC))`.
  6. `LoginUseCase` trả `TokenResponseDTO` về Presentation Layer.

---

## 3. Identity Resolution

* Phù hợp với **Case B** đã xác minh tại CP1: Endpoint `/auth/login` của External Auth Server chỉ trả cặp token (`access_token`, `refresh_token`), không kèm profile user.
* Do đó, sau khi login thành công, `LoginUseCase` dùng `access_token` gọi ngay `AuthClient.get_me(access_token)` để lấy ID người dùng thực tế từ External Auth Server một cách chính xác mà không cần decode token bằng local secret không đảm bảo tính toàn vẹn từ bên thứ ba.

---

## 4. Data Model Decision

Bảng dữ liệu: **`user_login_metadata`**

```sql
CREATE TABLE user_login_metadata (
    user_id VARCHAR(255) NOT NULL PRIMARY KEY,
    last_login_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
```

* **Nguyên tắc**: Tối giản và đúng trọng tâm.
* **Không lưu**: mật khẩu, hash mật khẩu, token, payload JWT hay snapshot thông tin Manage user (Manage Service là Source of Truth cho name/email/roles/avatar).
* **Constraint**: `PRIMARY KEY (user_id)` đảm bảo mỗi user chỉ có tối đa 1 row duy nhất. Login lần sau sẽ cập nhật (`UPSERT`) row cũ.

---

## 5. User ID Type Decision

* **Quyết định**: Sử dụng **`String(255)`** (`str` trong Python).
* **Căn cứ nhất quán trong dự án**:
  * `projects.owner_id`: `String(255)` (`modules/project/models/project.py`)
  * `project_members.user_id`: `String(255)` (`modules/project/models/project.py`)
  * `apps/api/routers/project.py`: `owner_id_str = str(current_user.id)`
  * `apps/api/deps/roles.py`: `user_id_str = str(current_user.id)`
  * `modules/identity/domain/entities.py`: `AuthPayload.user_id: str`
* Mọi tham chiếu tới ID người dùng ngoài trong PostgreSQL đều được chuẩn hóa dạng chuỗi ký tự, đảm bảo tương thích hoàn hảo nếu phía Manage Service sử dụng UUID, ULID hoặc bigint dạng chuỗi.

---

## 6. Timestamp Strategy

* Sử dụng `DateTime(timezone=True)` (`TIMESTAMPTZ` trong PostgreSQL).
* Thời gian được tạo bằng `datetime.now(UTC)` theo đúng chuẩn `TimestampMixin` của dự án (`core/database/base.py`).
* Không lưu timezone địa phương, không lưu string thô; việc hiển thị múi giờ sẽ do Frontend phụ trách.

---

## 7. Repository Design

* **Interface**: `IUserLoginRepository` (`modules/identity/domain/interfaces.py`)
  * `upsert_last_login(user_id: str, last_login_at: datetime) -> UserLoginMetadataEntity`
  * `get_by_user_id(user_id: str) -> UserLoginMetadataEntity | None`
  * `get_by_user_ids(user_ids: Sequence[str]) -> dict[str, datetime]` (Chuẩn bị sẵn cho Checkpoint 3 để merge Last Login vào danh sách user theo dạng batch O(1) in-memory lookup, loại bỏ hoàn toàn vấn đề N+1 query).
* **Concrete Class**: `SqlUserLoginRepository` (`modules/identity/repository/user_login_repository.py`)
  * Thực hiện **Atomic UPSERT** qua PostgreSQL `insert(...).on_conflict_do_update(...)`.

---

## 8. Login Integration & Failure Strategy

* **Best-Effort Persistence**:
  * Nếu quá trình ghi `last_login_at` gặp lỗi DB (ví dụ nghẽn kết nối database nội bộ), `LoginUseCase` ghi log cảnh báo (`logger.warning`) nhưng **KHÔNG làm gián đoạn đăng nhập của user** (User vẫn nhận được token hợp lệ để làm việc).
  * Điều này đảm bảo tính sẵn sàng cao (High Availability) của tính năng xác thực cốt lõi.

---

## 9. Migration Status

* **Revision ID**: `008_create_user_login_metadata`
* **Down Revision**: `5424e25876cf`
* **File**: `migrations/versions/008_create_user_login_metadata.py`
* **Upgrade status**: Đã chạy thành công `alembic upgrade head` trên dev database.

---

## 10. Hardcode / Clean Code Fixes

1. `migrations/env.py`: Đã bổ sung `import modules.identity.models` để Alembic tự động quản lý metadata bảng `user_login_metadata`.
2. `modules/identity/domain/`: Tách bạch hoàn toàn Domain Entity (`UserLoginMetadataEntity`) và Interface (`IUserLoginRepository`) khỏi ORM Model.
3. `modules/identity/di.py`: Đăng ký `SqlUserLoginRepository` vào Dishka container theo đúng vòng đời `Scope.REQUEST`.

---

## 11. Tests Executed & Results

Đã bổ sung và thực thi test suite:
* **`tests/test_last_login.py`**:
  * `test_first_login_creates_last_login_record` (Tạo mới bản ghi khi login lần đầu) — **PASSED**
  * `test_second_login_updates_existing_record` (Cập nhật bản ghi, không duplicate row) — **PASSED**
  * `test_failed_login_does_not_update_last_login` (Login 401 không tạo/sửa bản ghi) — **PASSED**
  * `test_db_failure_does_not_break_login` (Best-effort failure: lỗi DB không ngắt login) — **PASSED**
  * `test_repository_model_conversion_and_batch_query` (ORM conversion và batch query CP3) — **PASSED**

**Tổng kết**:
* **Pytest**: `15 passed in 7.81s` (100% PASS).
* **Ruff**: `All checks passed!` (Clean 100%).

---

## 12. Files Changed

* [modules/identity/domain/entities.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/domain/entities.py) — Thêm `UserLoginMetadataEntity`.
* [modules/identity/domain/interfaces.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/domain/interfaces.py) **[NEW]** — Interface `IUserLoginRepository`.
* [modules/identity/domain/__init__.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/domain/__init__.py) — Export entity & interface.
* [modules/identity/models/user_login.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/models/user_login.py) **[NEW]** — Model `UserLoginMetadataModel`.
* [modules/identity/models/__init__.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/models/__init__.py) **[NEW]** — Export model.
* [modules/identity/repository/user_login_repository.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/repository/user_login_repository.py) **[NEW]** — `SqlUserLoginRepository`.
* [modules/identity/repository/__init__.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/repository/__init__.py) **[NEW]** — Export repository.
* [modules/identity/use_cases/login.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/use_cases/login.py) — Tích hợp identity resolution & upsert last login.
* [modules/identity/di.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/modules/identity/di.py) — Cung cấp `IUserLoginRepository` qua Dishka DI.
* [migrations/env.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/migrations/env.py) — Import `modules.identity.models`.
* [migrations/versions/008_create_user_login_metadata.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/migrations/versions/008_create_user_login_metadata.py) **[NEW]** — Alembic migration.
* [tests/test_last_login.py](file:///d:/DUT%20AI%20CLUB/PROJECT/DUT-AI-DATA-PLATFORM/dut-ai-data-platform/tests/test_last_login.py) **[NEW]** — Unit tests cho Last Login.

---

## 13. Remaining Risks
* Không có rủi ro nào về kiến trúc. Cơ chế atomic upsert và batch fetching đã sẵn sàng để tích hợp vào Checkpoint 3.

---

## 14. Result

**PASS**
