# Contract: Auth API (Data Platform làm Resource Server của DUT AI SSO)

Base path từ trình duyệt: `https://workspace.dutai.io.vn/data/api/v1/auth`. Next rewrite chuyển tiếp sang `http://api:8000/api/v1/auth`.

Mọi response 401 đều kèm header `WWW-Authenticate: Bearer`.

## Cookies

Data Platform không tạo cookie trên production. Manage đặt cookie, Data Platform chỉ đọc và xoá.

| Cookie | Nội dung | Flags |
|---|---|---|
| `access_token` | Access JWT của Manage (`type=access`) | `HttpOnly; Path=/; SameSite=lax; Domain=${AUTH_COOKIE_DOMAIN}`, có `Secure` khi `AUTH_COOKIE_SECURE=true` |
| `refresh_token` | Refresh JWT của Manage (`type=refresh`) | Như trên. Data Platform không dùng để làm mới phiên |

## Access token claims (HS256, `JWT_SECRET_KEY` = `SECRET_KEY` của Manage)

```json
{
  "exp": 1767225600,
  "type": "access",
  "sub": "101",
  "user_id": 101,
  "name": "Nguyễn Văn A",
  "email": "a@example.com",
  "roles": ["Admin"],
  "avatar": "",
  "permissions": ["..."]
}
```

Điều kiện để token hợp lệ:
- có `exp` và `sub`;
- `type == "access"`;
- `int(sub) > 0`.

## `GET /me`

Đọc token từ cookie `access_token`, hoặc từ header `Authorization: Bearer <access token>`.

`200`:
```json
{ "id": 101, "name": "Nguyễn Văn A", "email": "a@example.com", "status": "ACTIVE", "avatar_url": null, "role_names": ["Admin"] }
```

Endpoint này cũng ghi `last_login_at`, tối đa một lần mỗi `ACTIVITY_RECORD_INTERVAL_MINUTES` phút.

`401` khi:
- thiếu token;
- sai chữ ký;
- token hết hạn;
- sai `type`;
- `sub` không hợp lệ.

## `POST /logout`

`200`:
```json
{ "is_success": true, "message": "Đăng xuất thành công." }
```

Response gửi hai header `Set-Cookie` xoá `access_token` và `refresh_token`: `Max-Age=0`, cùng `Domain`/`Path`/`Secure`/`SameSite` như khi Manage đặt cookie. Kết quả là đăng xuất khỏi mọi app DUT AI.

## `POST /login` (chỉ dùng khi phát triển local)

Khi `AUTH_LOCAL_LOGIN_ENABLED=false` (production): trả `404 {"detail": "Not Found"}` và không đặt cookie.

Khi `AUTH_LOCAL_LOGIN_ENABLED=true`:

Request:
```json
{ "email": "a@example.com", "password": "..." }
```

- `200`: body là user (cùng shape với `/me`). Hai cookie `access_token` và `refresh_token` chứa **nguyên token Manage trả về**, `Max-Age = exp - now` của từng token. Token không có trong body.
- `401`: sai thông tin đăng nhập, hoặc token Manage không verify được (cấu hình secret lệch).
- `502`/`504`: không kết nối được Manage, hoặc quá thời gian chờ.

**Breaking change**: body cũ là `{access_token, refresh_token, token_type}`, nay là user.

## Endpoint đã bỏ

- Không có `/refresh`.
- Data Platform không còn ký token nên không còn token `iss=dut-ai-data-platform`.

## Lỗi upstream khi gọi Manage service

`GET /api/v1/users` (qua `ManageClient`): khi Manage trả 401 hoặc 403 cho `MANAGE_API_TOKEN`, Data Platform trả **502** chứ không phải 401.
