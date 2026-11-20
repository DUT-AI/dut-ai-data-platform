# Specification Quality Checklist: Data Platform tham gia DUT AI SSO qua Workspace (`/data`)

**Purpose**: Kiểm tra spec đủ và đúng trước khi lên kế hoạch.
**Created**: 2026-11-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Không có chi tiết implementation thừa. Chỉ giữ lại tên cookie, claim, biến env và đường dẫn, vì đó là contract với Manage và Workspace.
- [x] Tập trung vào giá trị cho người dùng: đăng nhập một lần, đăng xuất chung, deploy an toàn.
- [x] Viết cho thành viên CLB, chủ nhiệm và người vận hành.
- [x] Đủ các mục bắt buộc.

## Requirement Completeness

- [x] Không còn marker [NEEDS CLARIFICATION].
- [x] Yêu cầu kiểm thử được và không mơ hồ.
- [x] Success criteria đo được (SC-001 đến SC-005).
- [x] Đủ acceptance scenario cho US1 đến US5.
- [x] Đã liệt kê edge case: refresh token, cổng 8000, cookie của httpx, 401 từ upstream, lệch claim so với spec của Workspace.
- [x] Phạm vi rõ ràng: không sửa Manage và Workspace, Label Studio nằm ngoài phạm vi.
- [x] Đã ghi phụ thuộc và giả định: secret, `MANAGE_API_TOKEN`, route Worker, hostname tunnel.

## Feature Readiness

- [x] Mỗi functional requirement đều có acceptance criteria.
- [x] User scenario phủ các luồng chính, cả production lẫn local dev.
- [x] Deploy có runbook, rollback và smoke test.

## Notes

Các quyết định đã chọn mặc định, cần chủ nhiệm xác nhận khi review:

- Bỏ cơ chế làm mới phiên, vì TTL mặc định của Manage khiến refresh không bao giờ thành công.
- `last_login_at` đổi nghĩa thành "lần gần nhất vào Data Platform", ghi qua `/auth/me` với throttle 15 phút.
- DB dùng cho production trên server phải được chốt trước bước migrate.
