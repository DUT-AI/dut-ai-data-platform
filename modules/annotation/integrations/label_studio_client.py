from typing import Any

import httpx
from loguru import logger


class LabelStudioClient:
    """Async HTTP client for Label Studio REST API using Legacy Token auth."""

    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key.strip()

    def _get_headers(self) -> dict[str, str]:
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

    async def get_or_create_project(
        self,
        title: str,
        label_config: str,
        webhook_url: str,
    ) -> int:
        # 1. List all projects, search by title
        resp = await self._request("GET", "/api/projects/", params={"page_size": 100})
        resp.raise_for_status()
        projects = resp.json().get("results", [])
        for p in projects:
            if p.get("title") == title:
                project_id: int = p["id"]
                logger.debug(
                    f"[LS] Reusing existing project id={project_id} title={title!r}"
                )
                await self._update_project(project_id, label_config, webhook_url)
                return project_id

        # 2. Create new project
        payload: dict[str, Any] = {
            "title": title,
            "label_config": label_config,
        }
        create_resp = await self._request("POST", "/api/projects/", json=payload)
        create_resp.raise_for_status()
        project_id = create_resp.json()["id"]
        logger.info(f"[LS] Created new project id={project_id} title={title!r}")

        # 3. Register webhook
        await self._register_webhook(project_id, webhook_url)
        return project_id

    async def _update_project(
        self, project_id: int, label_config: str, webhook_url: str
    ) -> None:
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
        try:
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

    async def create_task(
        self,
        project_id: int,
        task_data: dict[str, Any],
    ) -> int:
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
        return f"{self.base_url}/projects/{project_id}/data?task={task_id}"
