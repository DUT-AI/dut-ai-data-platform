from typing import Any

import httpx
from fastapi import HTTPException, status

from modules.identity.domain.entities import AuthUser, TokenResponse


class AuthClient:
    """HTTP Client to interact with external Auth Server API."""

    def __init__(self, auth_server_url: str, timeout: float = 10.0):
        self.auth_server_url = auth_server_url.rstrip("/")
        self.timeout = timeout

    def _build_url(self, path: str) -> str:
        """Construct full URL cleanly preventing duplicate /api/v1 paths."""
        base = self.auth_server_url
        clean_path = path.lstrip("/")

        if base.endswith("/api/v1") and clean_path.startswith("api/v1/"):
            clean_path = clean_path[len("api/v1/") :]

        return f"{base}/{clean_path}"

    async def get_me(self, token: str) -> AuthUser:
        """Fetch current user data from Auth Server GET /api/v1/auth/me."""
        url = self._build_url("/api/v1/auth/me")
        headers = {"Authorization": f"Bearer {token}"}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 401:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Phiên đăng nhập hết hạn hoặc không hợp lệ.",
                    )
                response.raise_for_status()

                payload: dict[str, Any] = response.json()
                if not payload.get("is_success") or "data" not in payload:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=payload.get("message", "Lỗi lấy thông tin người dùng"),
                    )

                data = payload["data"]
                return AuthUser(
                    id=data["id"],
                    name=data["name"],
                    email=data["email"],
                    status=data.get("status", "ACTIVE"),
                    avatar_url=data.get("avatar_url"),
                    role_names=data.get("role_names", []),
                )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Auth Server tại {self.auth_server_url}. Vui lòng kiểm tra lại Auth Server.",
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Auth Server tại {self.auth_server_url} bị quá thời gian (timeout).",
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Auth Server: {exc.response.text}",
            )

    async def login(self, email: str, password: str) -> TokenResponse:
        """Perform login against Auth Server POST /api/v1/auth/login."""
        url = self._build_url("/api/v1/auth/login")
        payload = {"email": email, "password": password}

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                if response.status_code in (400, 401, 422):
                    res_err = response.json() if response.content else {}
                    msg = (
                        res_err.get("message") or "Email hoặc mật khẩu không chính xác."
                    )
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail=msg,
                    )
                response.raise_for_status()

                res_json: dict[str, Any] = response.json()
                if not res_json.get("is_success") or "data" not in res_json:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=res_json.get("message", "Đăng nhập không thành công"),
                    )

                data = res_json["data"]
                return TokenResponse(
                    access_token=data["access_token"],
                    refresh_token=data["refresh_token"],
                    token_type=data.get("token_type", "bearer"),
                )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Không thể kết nối tới Auth Server tại {self.auth_server_url}. Vui lòng kiểm tra lại Auth Server.",
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=f"Yêu cầu tới Auth Server tại {self.auth_server_url} bị quá thời gian (timeout).",
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=exc.response.status_code,
                detail=f"Lỗi Auth Server: {exc.response.text}",
            )
