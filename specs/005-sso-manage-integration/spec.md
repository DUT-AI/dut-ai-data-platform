# Feature Specification: Data Platform tham gia DUT AI SSO qua Workspace (`/data`) và deploy

**Feature Branch**: `feat/sso-manage-integration`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "Code SSO và deploy lên server. Các app của CLB đều đăng nhập qua workspace: DUT AI Manage cấp JWT/access token, các app con chỉ dùng lại. Data Platform phải làm giống vậy và chạy ở `workspace.dutai.io.vn/data`."

## Bối cảnh

Hệ sinh thái CLB dùng chung domain `workspace.dutai.io.vn`, theo repo `DUT-AI-workspace`:

- **Cloudflare Worker** route theo prefix: `/manage/*`, `/lms/*`, `/meetly/*`. Mỗi prefix trỏ tới tunnel của app tương ứng, giữ nguyên path và gửi kèm header `X-Forwarded-Prefix`.
- **DUT AI Manage là Identity Provider duy nhất.** Sau khi đăng nhập ở `/manage/login`, Manage đặt hai cookie `access_token` và `refresh_token`. Cả hai có `Domain=.dutai.io.vn; Path=/; HttpOnly; SameSite=Lax; Secure`.
- **Các app con là Resource Server.** Chúng không tạo token, chỉ verify JWT trong bộ nhớ bằng secret chung (`SECRET_KEY` của Manage).

Data Platform hiện đứng ngoài hệ thống này:
- Có form đăng nhập riêng, tự ký JWT riêng (`iss=dut-ai-data-platform`), dùng cookie host-only.
- Chưa chạy dưới `/data`.
- Server deploy (`dutai-minipc`) mới chỉ chạy DB, Redis và MinIO, chưa chạy API và web.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Đã đăng nhập Workspace thì vào thẳng Data Platform (Priority: P1)

Là thành viên CLB đã đăng nhập ở `workspace.dutai.io.vn/manage/login`, tôi muốn mở `workspace.dutai.io.vn/data` mà không phải đăng nhập lại.

**Why this priority**: Đây là mục tiêu của task. Thiếu story này thì Data Platform vẫn là hệ thống đăng nhập riêng.

**Independent Test**: Đăng nhập ở `/manage/login` rồi mở `/data/dashboard` trên cùng trình duyệt. Dashboard hiện ra với tên người dùng.

**Acceptance Scenarios**:

1. **Given** cookie `access_token` hợp lệ do Manage cấp, **When** web gọi `GET /data/api/v1/auth/me`, **Then** trả 200 với các trường:
   - `id` = `sub`
   - `name`, `email`
   - `avatar_url` = `avatar`
   - `role_names` = claim `roles`
2. **Given** token có `roles=["Admin"]`, **When** gọi API yêu cầu quyền hệ thống `admin`, **Then** được phép. Với `roles=["Teammate"]` thì trả 403.
3. **Given** cookie chứa refresh token của Manage thay cho access token, **When** gọi API bảo vệ, **Then** trả 401.
4. **Given** token sai chữ ký, hết hạn, thiếu `exp`, hoặc `sub` không phải số nguyên dương, **When** gọi API bảo vệ, **Then** trả 401.

---

### User Story 2 - Chưa đăng nhập thì được đưa về trang đăng nhập chung (Priority: P1)

Là người chưa đăng nhập, khi mở bất kỳ trang nào của Data Platform, tôi muốn được đưa về trang đăng nhập chung của Workspace. Data Platform không có màn đăng nhập riêng trên production.

**Independent Test**: Mở `workspace.dutai.io.vn/data/projects` trong cửa sổ ẩn danh. Trình duyệt chuyển tới `workspace.dutai.io.vn/manage/login`.

**Acceptance Scenarios**:

1. **Given** không có cookie hợp lệ, **When** web nhận 401 từ API, **Then** trình duyệt chuyển tới `NEXT_PUBLIC_SSO_LOGIN_URL`. Không lặp redirect.
2. **Given** production (`AUTH_LOCAL_LOGIN_ENABLED=false`), **When** gọi `POST /api/v1/auth/login`, **Then** trả 404 và không đặt cookie.
3. **Given** production, **When** mở `/data/login`, **Then** bị chuyển tới trang đăng nhập chung.

---

### User Story 3 - Đăng xuất toàn hệ thống (Priority: P2)

Là người dùng, khi bấm Đăng xuất ở Data Platform, tôi muốn mất phiên ở mọi app CLB và quay về Portal.

**Independent Test**: Đăng xuất ở Data Platform, reload `/manage/dashboard`, thấy bị chuyển về trang đăng nhập.

**Acceptance Scenarios**:

1. **Given** đã đăng nhập, **When** gọi `POST /api/v1/auth/logout`, **Then** response xoá `access_token` và `refresh_token` với `Domain=.dutai.io.vn`.
2. **Given** đăng xuất xong, **When** web nhận response, **Then** trình duyệt chuyển tới `NEXT_PUBLIC_SSO_LOGOUT_REDIRECT` (Portal `/`).

---

### User Story 4 - Lập trình viên vẫn chạy được trên máy cá nhân (Priority: P2)

Là lập trình viên, tôi muốn chạy web và API trên `localhost`. Cookie `.dutai.io.vn` không tới được `localhost`, nên tôi cần một cách đăng nhập cục bộ bằng tài khoản Manage.

**Independent Test**:
1. Bật `AUTH_LOCAL_LOGIN_ENABLED=true` và `NEXT_PUBLIC_LOCAL_LOGIN_ENABLED=true`.
2. Mở `http://localhost:3000/data/login` và đăng nhập.
3. Vào được dashboard, cookie là host-only trên `localhost`.

**Acceptance Scenarios**:

1. **Given** cờ local bật, **When** login đúng, **Then** cookie chứa **đúng token Manage trả về** (Data Platform không ký token). `Max-Age` theo `exp` của từng token. Body không chứa token.
2. **Given** Manage nhận mật khẩu nhưng token không verify được (secret lệch), **When** login, **Then** trả 401, không đặt cookie, và log lỗi cấu hình.

---

### User Story 5 - Deploy lên server CLB (Priority: P1)

Là người vận hành, tôi muốn có runbook deploy API và web lên `dutai-minipc` mà không ảnh hưởng các dịch vụ dùng chung, cùng tài liệu bàn giao để chủ nhiệm thêm route `/data` vào Worker.

**Independent Test**: Làm theo `quickstart.md` §4–§5. Smoke test 1–6 đều đạt.

**Acceptance Scenarios**:

1. **Given** server đã có env SSO và public hostname `dataplatform.dutai.io.vn → localhost:3036`, **When** chạy `docker compose up -d --no-deps api web`, **Then**:
   - chỉ hai container `api` và `web` được tạo hoặc thay;
   - `db`, `redis`, `minio` giữ nguyên (MinIO dùng chung với Meetly).
2. **Given** Worker đã có route `/data`, **When** chạy smoke test, **Then** SSO hai chiều và đăng xuất toàn hệ thống đều hoạt động.

### Edge Cases

- Port host `8000` của server thuộc Manage API, nên API Data Platform **không** publish ra host. Web gọi API qua rewrite trong mạng docker.
- Không còn đường làm mới phiên (refresh). Với cấu hình mặc định của Manage, access token sống 8 ngày, lâu hơn refresh token 7 ngày. Hết hạn thì người dùng đăng nhập lại ở Workspace.
- Token là stateless. User bị khoá ở Manage vẫn dùng được tới khi token hết hạn. Đây là hành vi có sẵn của toàn hệ sinh thái.
- Client HTTP dùng chung để gọi Manage không được lưu cookie. Nếu lưu, lời gọi service sẽ chạy dưới phiên của người dùng vừa đăng nhập cục bộ.
- Manage API từ chối `MANAGE_API_TOKEN`: trả 502 chứ không phải 401, để web không hiểu nhầm là hết phiên rồi redirect liên tục.
- Spec của Workspace ghi claim `role_names`/`iat`, nhưng Manage thực tế phát `roles` và không có `iat`. Data Platform theo token thật.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: API MUST verify access token của Manage tại chỗ:
  - thuật toán HS256 với secret chung;
  - bắt buộc có `exp` và `sub`;
  - `type == "access"`;
  - `sub` là số nguyên dương.

  API không gọi Manage trên mỗi request.
- **FR-002**: Data Platform MUST NOT ký JWT. Không còn `create_access_token`, không còn claim `iss=dut-ai-data-platform`.
- **FR-003**: Claims MUST map như sau: `roles` → `role_names`, `avatar` → `avatar_url`, `name`, `email`.
- **FR-004**: `POST /auth/logout` MUST xoá `access_token` và `refresh_token` với `Domain=AUTH_COOKIE_DOMAIN`, đúng `Path`/`Secure`/`SameSite` như Manage.
- **FR-005**: `POST /auth/login` MUST chỉ hoạt động khi `AUTH_LOCAL_LOGIN_ENABLED=true`, ngược lại trả 404. Khi hoạt động, nó MUST đặt token gốc của Manage vào cookie và MUST NOT trả token trong body.
- **FR-006**: `GET /auth/me` MUST ghi `last_login_at`, tối đa một lần mỗi `ACTIVITY_RECORD_INTERVAL_MINUTES` phút cho mỗi user, bằng một câu upsert có điều kiện.
- **FR-007**: Client HTTP gọi Manage MUST NOT lưu cookie.
- **FR-008**: `ManageClient` MUST chuyển 401/403 từ upstream thành 502.
- **FR-009**: Web MUST chạy dưới `basePath=/data` và gọi API same-origin qua `/data/api/v1`. Mọi đường dẫn tuyệt đối không đi qua router (`window.location`, ảnh template trong `public/`) MUST có prefix.
- **FR-010**: Khi gặp 401, web MUST chuyển tới `NEXT_PUBLIC_SSO_LOGIN_URL`. Sau khi đăng xuất, web MUST chuyển tới `NEXT_PUBLIC_SSO_LOGOUT_REDIRECT`.
- **FR-011**: Deploy MUST NOT tạo lại container `db`/`redis`/`minio`/`createbuckets`, MUST NOT đổi tên volume, và MUST NOT đổi `MINIO_ROOT_*` hay port 9000.
- **FR-012**: Data Platform MUST NOT kết nối DB hoặc Redis của Manage.

### Key Entities

- **SSO access token**: do Manage cấp. Gồm `sub`, `user_id`, `type="access"`, `name`, `email`, `roles`, `avatar`, `permissions`, `exp`.
- **SSO refresh token**: cùng bộ claims nhưng `type="refresh"`. Data Platform chỉ đọc `exp` của nó khi đăng nhập cục bộ.
- **UserLoginMetadata** (đã có, không đổi schema): `user_id`, `last_login_at`. Ý nghĩa đổi thành "lần gần nhất vào Data Platform".

## Success Criteria *(mandatory)*

- **SC-001**: Người đã đăng nhập Workspace mở `/data` mà không phải nhập mật khẩu (0 form đăng nhập).
- **SC-002**: Đăng xuất ở Data Platform thì `/manage` mất phiên ở lần tải tiếp theo.
- **SC-003**: `uv run pytest tests/ -q` có 0 test fail. Web `pnpm lint`, `pnpm typecheck`, `pnpm build` đều pass.
- **SC-004**: Smoke test production đạt 6/6.
- **SC-005**: Sau deploy, `docker compose ps` cho thấy `db`, `redis`, `minio` vẫn là container cũ (không bị tạo lại).

## Assumptions

- Chủ nhiệm CLB thêm route `/data` vào Worker của Workspace (`contracts/workspace-gateway-handoff.md`).
- Người deploy tạo public hostname `dataplatform.dutai.io.vn → http://localhost:3036` trên tunnel của minipc.
- Lead cấp `SECRET_KEY` của Manage và `MANAGE_API_TOKEN` cho server.
- Ngoài phạm vi:
  - sửa repo Manage và Workspace;
  - return-URL sau khi đăng nhập;
  - Label Studio trên production;
  - phân quyền theo claim `permissions`.
