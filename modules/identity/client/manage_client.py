import asyncio
from typing import Any

import httpx
from fastapi import HTTPException, status

from core.config.manage_client import manage_settings
from modules.identity.client.http import build_manage_http_client
from modules.identity.dtos.manage_dtos import (
    ManageUserDTO,
    ManageUsersResponseDTO,
)


class ManageClient:
    """HTTP Client to interact with external Manage Service API (Read-Only)."""

    def __init__(
        self,
        client: httpx.AsyncClient | None = None,
        timeout: float = 10.0,
    ) -> None:
        self.timeout = timeout
        self._client = client
        try:
            self._client_loop = asyncio.get_running_loop()
        except RuntimeError:
            self._client_loop = None

    @property
    def client(self) -> httpx.AsyncClient:
        current_loop = None
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

        if (
            self._client is None
            or self._client.is_closed
            or (
                current_loop is not None
                and self._client_loop is not None
                and self._client_loop != current_loop
            )
            or (self._client_loop is not None and self._client_loop.is_closed())
        ):
            self._client = build_manage_http_client(self.timeout)
            self._client_loop = current_loop
        return self._client

    @staticmethod
    def _parse_user(item: dict[str, Any]) -> ManageUserDTO:
        return ManageUserDTO(
            id=item.get("id") or item.get("user_id", ""),
            name=item.get("name") or item.get("username", ""),
            email=item.get("email", ""),
            status=item.get("status", "ACTIVE"),
            avatar_url=item.get("avatar_url"),
            role_names=item.get("role_names")
            or ([item["role"]] if "role" in item else []),
        )

    async def list_all_users(self, page_size: int = 100) -> list[ManageUserDTO]:
        """Every user, following Manage's pagination (for id -> profile lookups)."""
        users: list[ManageUserDTO] = []
        page = 1
        while True:
            resp = await self.list_users(page=page, page_size=page_size)
            users.extend(resp.items)
            if not resp.items or len(users) >= resp.total:
                return users
            page += 1

    async def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> ManageUsersResponseDTO:
        """Fetch users from Manage Service GET /api/v1/users."""
        headers = {}

        if manage_settings.token:
            headers["Authorization"] = f"Bearer {manage_settings.token}"
        params: dict[str, Any] = {
            "page": page,
            "page_size": page_size,
        }
        if search and search.strip():
            # Manage filters with `keyword` (name or email); it ignores `search`.
            params["keyword"] = search.strip()

        try:
            response = await self.client.get(
                manage_settings.users_url, headers=headers, params=params
            )
            if response.status_code in (401, 403):
                # Upstream credential problem (MANAGE_API_TOKEN), not the user's
                # session: a 401 here would make the web app re-login in a loop.
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Manage API từ chối Data Platform. Kiểm tra MANAGE_API_TOKEN.",
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

            data: list[dict[str, Any]] = payload.get("data", [])
            users = [self._parse_user(item) for item in data if isinstance(item, dict)]

            pagination = payload.get("pagination")
            if isinstance(pagination, dict) and "total" in pagination:
                # Manage already filtered and paginated: `data` IS the requested
                # page. Slicing it again emptied every page after the first and
                # capped `total` at one page (only 20 users ever listed).
                return ManageUsersResponseDTO(
                    items=users,
                    total=int(pagination["total"]),
                    page=int(pagination.get("page", page)),
                    page_size=int(pagination.get("page_size", page_size)),
                )

            # Legacy Manage without pagination metadata returns every user:
            # filter and paginate here, once.
            if search and search.strip():
                s = search.strip().lower()
                users = [u for u in users if s in u.name.lower() or s in u.email.lower()]
            start_idx = (page - 1) * page_size
            return ManageUsersResponseDTO(
                items=users[start_idx : start_idx + page_size],
                total=len(users),
                page=page,
                page_size=page_size,
            )
        except httpx.ConnectError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Manage Server tại {manage_settings.users_url}. Vui lòng kiểm tra lại Manage Server.",
            ) from exc
        except httpx.TimeoutException as exc:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Manage Server tại {manage_settings.users_url} bị quá thời gian (timeout).",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Manage Server: {exc.response.text}",
            ) from exc
