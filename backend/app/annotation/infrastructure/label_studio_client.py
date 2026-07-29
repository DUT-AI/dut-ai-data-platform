"""Label Studio REST API Client — Legacy Token Authentication.

Xác thực bằng Legacy Token với header 'Authorization: Token <token>'.
(Không phải Bearer — đó là cho Personal Access Token / JWT)

Theo docs: https://labelstud.io/guide/access_tokens
- Legacy Token → Authorization: Token <token>
- Personal Access Token (JWT) → Authorization: Bearer <access_token>
"""

from typing import Any

import httpx
from loguru import logger


class LabelStudioClient:
    """Async HTTP client for Label Studio REST API using Legacy Token auth."""

    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key.strip()

    def _get_headers(self) -> dict[str, str]:
        """Trả về headers với Legacy Token authentication."""
        return {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs,
    ) -> httpx.Response:
        """Thực hiện authenticated request với Legacy Token."""
        extra_headers = kwargs.pop("headers", {})
        req_headers = {**self._get_headers(), **extra_headers}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=req_headers,
                **kwargs,
            )

            if resp.status_code == 401:
                logger.error(
                    f"[LS] 401 Unauthorized for {path}. "
                    f"Check LABEL_STUDIO_API_KEY in .env. "
                    f"Response: {resp.text[:200]}"
                )
                resp.raise_for_status()

            return resp

    # ------------------------------------------------------------------
    # Project management
    # ------------------------------------------------------------------

    async def get_or_create_project(
        self,
        title: str,
        label_config: str,
        webhook_url: str,
    ) -> int:
        """Tìm project theo title, nếu chưa có thì tạo mới.

        Returns:
            ls_project_id (int)
        """
        # 1. List tất cả project, tìm theo title
        resp = await self._request("GET", "/api/projects/", params={"page_size": 100})
        resp.raise_for_status()
        projects = resp.json().get("results", [])
        for p in projects:
            if p.get("title") == title:
                project_id: int = p["id"]
                logger.debug(
                    f"[LS] Reusing existing project id={project_id} title={title!r}"
                )
                # Cập nhật label config + webhook nếu cần
                await self._update_project(project_id, label_config, webhook_url)
                return project_id

        # 2. Tạo project mới
        payload: dict[str, Any] = {
            "title": title,
            "label_config": label_config,
        }
        create_resp = await self._request("POST", "/api/projects/", json=payload)
        create_resp.raise_for_status()
        project_id = create_resp.json()["id"]
        logger.info(f"[LS] Created new project id={project_id} title={title!r}")

        # 3. Đăng ký webhook cho project mới
        await self._register_webhook(project_id, webhook_url)
        return project_id

    async def _update_project(
        self, project_id: int, label_config: str, webhook_url: str
    ) -> None:
        """Cập nhật label_config cho project hiện tại."""
        try:
            await self._request(
                "PATCH",
                f"/api/projects/{project_id}/",
                json={"label_config": label_config},
            )
            await self._register_webhook(project_id, webhook_url)
        except Exception as e:
            logger.warning(f"[LS] Could not update project {project_id}: {e}")

    async def _register_webhook(self, project_id: int, webhook_url: str) -> None:
        """Đăng ký (hoặc cập nhật) webhook cho project để LS gọi về Platform sau submit."""
        try:
            # List existing webhooks, tránh duplicate
            wh_resp = await self._request(
                "GET",
                "/api/webhooks/",
                params={"project": project_id},
            )
            wh_resp.raise_for_status()
            webhooks = (
                wh_resp.json()
                if isinstance(wh_resp.json(), list)
                else wh_resp.json().get("results", [])
            )

            for wh in webhooks:
                if wh.get("url") == webhook_url and wh.get("project") == project_id:
                    logger.debug(
                        f"[LS] Webhook already registered for project={project_id}"
                    )
                    return

            # Tạo webhook mới
            create_resp = await self._request(
                "POST",
                "/api/webhooks/",
                json={
                    "project": project_id,
                    "url": webhook_url,
                    "send_payload": True,
                    "send_for_all_actions": False,
                    "actions": ["ANNOTATION_CREATED", "ANNOTATION_UPDATED"],
                    "is_active": True,
                },
            )
            create_resp.raise_for_status()
            logger.info(
                f"[LS] Registered webhook for project={project_id} → {webhook_url}"
            )
        except Exception as e:
            logger.warning(
                f"[LS] Could not register webhook for project {project_id}: {e}"
            )

    # ------------------------------------------------------------------
    # Task management
    # ------------------------------------------------------------------

    async def create_task(
        self,
        project_id: int,
        task_data: dict[str, Any],
    ) -> int:
        """Tạo task mới trong project với data (ảnh + metadata).

        Returns:
            ls_task_id (int)
        """
        resp = await self._request(
            "POST",
            "/api/tasks/",
            json={"project": project_id, "data": task_data},
        )
        resp.raise_for_status()
        task_id: int = resp.json()["id"]
        logger.info(f"[LS] Created task id={task_id} in project={project_id}")
        return task_id

    def get_task_url(self, project_id: int, task_id: int) -> str:
        """Trả về URL để user mở task trong LS labeling interface.

        LS 1.23 dùng Data Manager view:
        /projects/{project_id}/data?task={task_id}
        """
        return f"{self.base_url}/projects/{project_id}/data?task={task_id}"
