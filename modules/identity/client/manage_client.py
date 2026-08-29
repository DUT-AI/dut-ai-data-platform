from typing import Any

import httpx
from fastapi import HTTPException, status

from modules.identity.dtos.manage_dtos import (
    ManageUserDTO,
    ManageUsersResponseDTO,
)


class ManageClient:
    """HTTP Client to interact with external Manage Service API (Read-Only)."""

    def __init__(
        self,
        manage_server_url: str,
        manage_api_token: str | None = None,
        timeout: float = 10.0,
    ):
        self.manage_server_url = manage_server_url.rstrip("/")
        self.manage_api_token = manage_api_token
        self.timeout = timeout

    def _build_url(self, path: str) -> str:
        """Construct full URL cleanly preventing duplicate /api/v1 paths."""
        base = self.manage_server_url
        clean_path = path.lstrip("/")

        if base.endswith("/api/v1") and clean_path.startswith("api/v1/"):
            clean_path = clean_path[len("api/v1/") :]

        return f"{base}/{clean_path}"

    async def list_users(
        self,
        token: str | None = None,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> ManageUsersResponseDTO:
        """Fetch users from Manage Service GET /api/v1/users."""
        url = self._build_url("/users")
        auth_token = token or self.manage_api_token
        headers = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        params: dict[str, Any] = {
            "page": page,
            "page_size": page_size,
        }
        if search:
            params["search"] = search

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers, params=params)
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Phiên đăng nhập hết hạn hoặc không có quyền truy cập Manage API.",
                    )
                response.raise_for_status()

                payload: dict[str, Any] = response.json()
                if (
                    payload.get("is_success") is False
                    or "data" not in payload
                    or payload.get("data") is None
                ):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=payload.get(
                            "message", "Lỗi lấy danh sách người dùng từ Manage API"
                        ),
                    )

                data = payload.get("data")
                items: list[ManageUserDTO] = []
                total = 0

                if isinstance(data, list):
                    # Direct list of user objects (when Manage server returns full unpaginated list)
                    all_items: list[ManageUserDTO] = []
                    for item in data:
                        if isinstance(item, dict):
                            all_items.append(
                                ManageUserDTO(
                                    id=item.get("id") or item.get("user_id", ""),
                                    name=item.get("name") or item.get("username", ""),
                                    email=item.get("email", ""),
                                    status=item.get("status", "ACTIVE"),
                                    avatar_url=item.get("avatar_url"),
                                    role_names=item.get("role_names")
                                    or ([item["role"]] if "role" in item else []),
                                    raw_data=item,
                                )
                            )

                    # In-memory search fallback if Manage server didn't filter
                    if search and search.strip():
                        s = search.strip().lower()
                        all_items = [
                            u
                            for u in all_items
                            if s in str(u.name).lower() or s in str(u.email).lower()
                        ]

                    total = len(all_items)
                    # Slicing fallback for unpaginated direct list
                    start_idx = (page - 1) * page_size
                    end_idx = start_idx + page_size
                    items = all_items[start_idx:end_idx]
                elif isinstance(data, dict):
                    # Paginated dictionary response { items / users, total, page, page_size }
                    raw_items = data.get("items") or data.get("users") or []
                    for item in raw_items:
                        if isinstance(item, dict):
                            items.append(
                                ManageUserDTO(
                                    id=item.get("id") or item.get("user_id", ""),
                                    name=item.get("name") or item.get("username", ""),
                                    email=item.get("email", ""),
                                    status=item.get("status", "ACTIVE"),
                                    avatar_url=item.get("avatar_url"),
                                    role_names=item.get("role_names")
                                    or ([item["role"]] if "role" in item else []),
                                    raw_data=item,
                                )
                            )
                    total = data.get("total", len(items))
                    # If server returned full list instead of paginated slice
                    if len(items) > page_size and total == len(items):
                        start_idx = (page - 1) * page_size
                        end_idx = start_idx + page_size
                        items = items[start_idx:end_idx]

                return ManageUsersResponseDTO(
                    items=items,
                    total=total,
                    page=page,
                    page_size=page_size,
                )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Manage Server tại {self.manage_server_url}. Vui lòng kiểm tra lại Manage Server.",
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Manage Server tại {self.manage_server_url} bị quá thời gian (timeout).",
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Manage Server: {exc.response.text}",
            )
