# FastAPI Backend Boilerplate (Clean Architecture / DDD)

Đây là một template boilerplate cho dự án backend sử dụng FastAPI, tuân thủ theo nguyên lý **Clean Architecture** và **Domain-Driven Design (DDD)**, sử dụng container Dependency Injection **Dishka**, cơ sở dữ liệu **PostgreSQL** (thông qua SQLAlchemy), quản lý lược đồ database với **Alembic**, và hỗ trợ lưu trữ tệp lên **S3 / MinIO**.

## Cấu trúc thư mục

```text
backend/
├── pyproject.toml      # Quản lý dependencies (sử dụng uv)
├── Dockerfile          # Docker cấu hình cho môi trường production
├── docker-compose.yml  # File compose khởi tạo Postgres & MinIO local
├── alembic.ini         # Cấu hình chung cho migrations
├── alembic/            # Thư mục chứa cấu hình chạy và tệp phiên bản migrations
├── app/
│   ├── main.py         # Khởi tạo FastAPI app, middlewares & router
│   ├── config.py       # Pydantic Settings cấu hình môi trường
│   ├── core/           # Chức năng core (JWT, băm mật khẩu, ICT time)
│   ├── domain/         # Chứa entities, exceptions, interfaces (Repository protocols)
│   ├── application/    # Chứa use_cases nghiệp vụ & dtos
│   ├── infrastructure/ # database, clients (S3), repositories (SQLAlchemy), di (Dishka)
│   └── presentation/   # FastAPI API routers & dependencies (xác thực token)
└── tests/              # Các bài kiểm thử unit & integration test
```

## Hướng dẫn cài đặt & Chạy local

### 1. Chuẩn bị môi trường
Yêu cầu đã cài đặt:
- Python >= 3.11
- [uv](https://github.com/astral-sh/uv) (Trình quản lý package siêu nhanh của Astral) hoặc `pip`
- Docker & Docker Compose (để chạy Postgres & MinIO)

### 2. Khởi động Cơ sở dữ liệu và Storage (Local Dev)
Chạy lệnh sau tại thư mục `backend/` để khởi động cơ sở dữ liệu PostgreSQL và MinIO (S3 mock):
```bash
docker compose up -d
```
MinIO Console sẽ chạy tại: `http://localhost:9001` (user: `miniouser`, pass: `miniopassword`).
Một bucket `boilerplate-uploads` sẽ tự động được khởi tạo và phân quyền public-read.

### 3. Cài đặt các thư viện Python
Sử dụng `uv`:
```bash
uv sync
```
Hoặc sử dụng `pip`:
```bash
pip install -e .
```

### 4. Áp dụng Database Migrations (Alembic)
Trước khi chạy ứng dụng lần đầu, bạn cần đồng bộ cấu trúc bảng vào cơ sở dữ liệu:
```bash
uv run alembic upgrade head
```

Nếu bạn thực hiện các thay đổi đối với model SQLAlchemy trong `app/infrastructure/persistence/models/`, hãy tự động tạo tệp migration mới bằng lệnh:
```bash
uv run alembic revision --autogenerate -m "Mô tả thay đổi"
```

### 5. Chạy Backend API
Sử dụng `uv`:
```bash
uv run uvicorn app.main:app --reload
```

Tài liệu Swagger UI sẽ khả dụng tại: `http://localhost:8000/docs`

---

## Hướng dẫn Chạy Kiểm thử (Tests)

Chạy bộ kiểm thử tự động (sử dụng SQLite in-memory tự động reset database sau mỗi test case):
```bash
uv run pytest
```
