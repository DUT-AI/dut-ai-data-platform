# Quickstart: chạy local, deploy và smoke test

## 1. Chạy local

Cookie `.dutai.io.vn` không tới được `localhost`, nên local dùng login proxy sau cờ.

`.env` (gốc repo):

```dotenv
JWT_SECRET_KEY=<SECRET_KEY của instance Manage mà AUTH_SERVER_URL trỏ tới>
AUTH_COOKIE_DOMAIN=
AUTH_COOKIE_SECURE=false
AUTH_LOCAL_LOGIN_ENABLED=true
AUTH_SERVER_URL=https://manage.dutai.io.vn/api/v1/auth/login
```

`web/.env`:

```dotenv
NEXT_PUBLIC_API_BASE_URL="http://localhost:8000/api/v1"
NEXT_PUBLIC_LOCAL_LOGIN_ENABLED="true"
```

Chạy:

```bash
make dev-api            # API: http://localhost:8000
make dev-web            # Web: http://localhost:3000/data
```

Mở `http://localhost:3000/data/login` và đăng nhập bằng tài khoản DUT AI Manage. Nếu đăng nhập thành công nhưng nhận 401, nghĩa là `JWT_SECRET_KEY` không khớp với Manage: log API sẽ ghi rõ.

## 2. Kiểm thử tự động

```bash
uv run pytest tests/ -q          # kỳ vọng: 0 failed
uv run ruff check .              # kỳ vọng: All checks passed!
cd web && pnpm lint && pnpm typecheck && pnpm build
```

Các test chính:
- `tests/test_auth_completion.py`
- `tests/test_last_login.py`
- `tests/test_identity_http_client.py`
- `tests/test_manage_client.py`

## 3. Biến môi trường

| Biến | Local | Production |
|---|---|---|
| `JWT_SECRET_KEY` | secret của Manage dùng khi dev | `SECRET_KEY` của Manage |
| `AUTH_COOKIE_DOMAIN` | (trống) | `.dutai.io.vn` |
| `AUTH_COOKIE_SECURE` | `false` | `true` |
| `AUTH_LOCAL_LOGIN_ENABLED` | `true` | `false` |
| `ACTIVITY_RECORD_INTERVAL_MINUTES` | `15` | `15` |
| `MANAGE_API_TOKEN`, `USER_ENDPOINT` | theo lead cấp | theo lead cấp |
| `MINIO_ENDPOINT`, `MINIO_PUBLIC_ENDPOINT` | `https://dataplatforms3.dutai.io.vn` | `https://dataplatforms3.dutai.io.vn` |
| `CORS_ORIGINS` | mặc định | `https://workspace.dutai.io.vn` |
| `WEB_HOST_PORT` | — | `3036` |
| `API_HOST_PORT` | `8000` (mặc định) | `8010` (chỉ mở trên `127.0.0.1`; cổng 8000 của host là Manage API) |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api/v1` | `/data/api/v1` |
| `NEXT_PUBLIC_LOCAL_LOGIN_ENABLED` | `true` | `false` |
| `NEXT_PUBLIC_SSO_LOGIN_URL` | (trống, dùng `/data/login`) | `https://workspace.dutai.io.vn/manage/login` |
| `NEXT_PUBLIC_SSO_LOGOUT_REDIRECT` | (trống) | `https://workspace.dutai.io.vn/` |
| `API_PROXY_ORIGIN` | (trống) | `http://api:8000` |

Các biến `NEXT_PUBLIC_*` và `API_PROXY_ORIGIN` được đọc **lúc build** web.

## 4. Deploy lên `dutai-minipc`

Chạy trong `~/Documents/dut-ai-data-platform`.

Các quy tắc an toàn:
- MinIO của Data Platform dùng chung với Meetly.
- Không bao giờ chạy `docker compose up -d` hoặc `docker compose down` không kèm tên service.
- Không đổi `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` và cổng 9000.
- Không publish cổng 8000 (đó là cổng của Manage API).

### 4.1 Snapshot trước khi deploy

```bash
docker compose ps
docker compose images
git rev-parse HEAD > ~/data-platform-predeploy.txt
docker ps --filter "name=data-platform" --format "{{.Names}} {{.Image}} {{.ID}}" >> ~/data-platform-predeploy.txt
cp .env ~/data-platform-env.predeploy && cp web/.env ~/data-platform-web-env.predeploy
```

### 4.2 So sánh các service dùng chung

```bash
git fetch origin
git diff HEAD origin/main -- docker-compose.yml
```

**Dừng lại và hỏi** nếu diff có thay đổi ở:
- `db`, `redis`, `minio`, `createbuckets`: image, ports, environment, volumes, container_name, networks;
- tên trong `volumes:` hoặc `networks:`.

### 4.3 Cập nhật code và env

```bash
git checkout main && git pull --ff-only origin main
```

Tạo database và bucket production. Làm theo khuôn `_dev`/`_prod` của Manage và clb: dùng ngay container `data-platform-db` / `data-platform-minio` đang chạy, không tạo container mới.

```bash
docker exec data-platform-db sh -c 'createdb -U "$POSTGRES_USER" data_platform_prod'   # chạy lại báo "already exists" thì bỏ qua
docker compose run --rm --no-deps -e DEFAULT_BUCKET=ai-data-platform-prod createbuckets
```

| | Dev (team, qua Tailscale `100.84.65.48`) | Production (container `api`) |
|---|---|---|
| Database | `data_platform_dev` (cổng host 5432) | `data_platform_prod` (qua `db:5432` trong mạng docker) |
| Bucket | `ai-data-platform` | `ai-data-platform-prod` |

`meetly_dev` và các bucket `meetly-*` nằm trong cùng container nhưng thuộc Meetly. Không được đụng tới.

Thêm vào `.env` các biến ở cột Production của §3, cộng thêm:

```dotenv
DATABASE_URL=postgresql+asyncpg://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/data_platform_prod
DEFAULT_BUCKET=ai-data-platform-prod
```

Giữ nguyên `POSTGRES_*` và `MINIO_ROOT_*`.

Thay `web/.env` bằng các biến `NEXT_PUBLIC_*` và `API_PROXY_ORIGIN` của cột Production.

### 4.4 Build, migrate, chạy

> **Lưu ý (2026-11-20).** Chuỗi migration hiện tại **không chạy được trên DB trống**. Migration `9ff22f25ac12_remove_template` được sinh tự động từ một DB dev đã lệch schema, nên khi chạy nó xoá các index và constraint mà DB mới không có. Hai lỗi khác đã được sửa:
> - `009` hiểu nhầm `:null` là tham số;
> - cột `alembic_version` chỉ dài 32 ký tự.
>
> Vì vậy lần đầu `data_platform_prod` được khởi tạo bằng cách khác: chép **cấu trúc** schema `public` của `data_platform_dev`, kèm dữ liệu 3 bảng `alembic_version`, `input_definitions` và `output_definitions`. Không chép dữ liệu dev. Các lần deploy sau DB đã ở head, nên `alembic upgrade head` chạy bình thường.
>
> ```bash
> docker exec data-platform-db sh -c 'pg_dump -U "$POSTGRES_USER" -d data_platform_dev --schema-only --schema=public --no-owner --no-privileges' \
>   | sed -E '/^CREATE SCHEMA public;$/d; /^COMMENT ON SCHEMA public /d' > /tmp/dp_schema.sql
> docker exec data-platform-db sh -c 'pg_dump -U "$POSTGRES_USER" -d data_platform_dev --data-only --no-owner -t public.alembic_version -t public.input_definitions -t public.output_definitions' > /tmp/dp_seed.sql
> cat /tmp/dp_schema.sql /tmp/dp_seed.sql | docker exec -i data-platform-db sh -c 'psql -U "$POSTGRES_USER" -d data_platform_prod -q -v ON_ERROR_STOP=1 --single-transaction'
> rm -f /tmp/dp_schema.sql /tmp/dp_seed.sql
> ```

```bash
docker compose build api web
docker compose run --rm --no-deps api alembic heads       # kỳ vọng: đúng 1 head
docker compose run --rm --no-deps api alembic upgrade head
docker compose up -d --no-deps api web
docker compose ps api web
docker compose logs --tail=50 api
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3036/data/login    # kỳ vọng: 307
docker compose exec web wget -qO- http://api:8000/health
```

Chỉ khi cần worker:

```bash
docker compose up -d --no-deps rabbitmq worker
```

### 4.5 Public hostname

Trong Cloudflare dashboard, vào Zero Trust → Networks → Tunnels → tunnel minipc → Public Hostname, thêm `dataplatform.dutai.io.vn` → `HTTP localhost:3036`.

Kiểm tra:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://dataplatform.dutai.io.vn/data/login    # kỳ vọng: 307
```

### 4.6 Worker

Chủ nhiệm thêm route `/data` vào Worker theo [contracts/workspace-gateway-handoff.md](./contracts/workspace-gateway-handoff.md).

### 4.7 Rollback

```bash
docker compose stop api web
git checkout "$(head -1 ~/data-platform-predeploy.txt)"
cp ~/data-platform-env.predeploy .env && cp ~/data-platform-web-env.predeploy web/.env
```

`api` và `web` chưa từng chạy trước lần deploy này, nên dừng chúng là đủ để quay lại trạng thái cũ. Các container `db`, `redis` và `minio` không bị đụng tới. Database `data_platform_prod` và bucket `ai-data-platform-prod` cứ để nguyên, lần deploy sau dùng lại được.

## 5. Smoke test production

Mở DevTools → Application → Cookies.

1. Đăng xuất hết, đăng nhập ở `https://workspace.dutai.io.vn/manage/login`, rồi mở `/data/dashboard`. Kỳ vọng: vào thẳng, hiện đúng tên người dùng.
2. Ở cửa sổ ẩn danh, mở `/data/projects`. Kỳ vọng: bị chuyển tới `/manage/login`. Mở `/data/login` cũng bị chuyển như vậy.
3. Bấm Đăng xuất ở Data Platform. Kỳ vọng: về Portal `/`, cookie `access_token`/`refresh_token` (Domain `.dutai.io.vn`) bị xoá. Reload `/manage/dashboard`: bị chuyển về trang đăng nhập. Ghi lại hành vi thực tế.
4. Đăng nhập lại, mở trang Users. Kỳ vọng: danh sách user hiện ra. Nếu nhận 502, kiểm tra `MANAGE_API_TOKEN`.
5. Upload một ảnh vào dataset. Kỳ vọng: request PUT đi tới `dataplatforms3.dutai.io.vn` và upload thành công. Ảnh template trong màn tạo project hiển thị từ `/data/static/templates/...`.
6. `curl -s -X POST https://workspace.dutai.io.vn/data/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"a@b.c","password":"x"}' -o /dev/null -w "%{http_code}\n"`. Kỳ vọng: `404`.

## 6. Rủi ro đã biết (ngoài phạm vi)

- Docker API trên server mở ở `*:2375`. Các service cũ của Data Platform publish trên `0.0.0.0` (5432, 6379, 9000/9001).
- Label Studio chưa chạy trên server, nên các tính năng dùng Label Studio sẽ lỗi trên production.
- Mọi subdomain `*.dutai.io.vn` đều nhận cookie SSO. Đây là đặc điểm có sẵn của thiết kế Workspace.
- Token là stateless: user bị khoá ở Manage vẫn còn quyền truy cập đến khi `exp` hết hạn.
