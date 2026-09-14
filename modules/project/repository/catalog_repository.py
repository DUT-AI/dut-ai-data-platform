import json
from pathlib import Path
from typing import Any

from modules.project.domain.catalog_entities import ProjectTemplateEntity
from modules.project.domain.catalog_interfaces import IProjectCatalogRepository


class InMemoryProjectCatalogRepository(IProjectCatalogRepository):
    """In-memory catalog repository for DUT-AI Native platform templates."""

    def __init__(self) -> None:
        self._templates_by_id: dict[str, dict[str, Any]] = {}
        self._catalog_templates: list[dict[str, Any]] = []
        self._catalog_groups: list[str] = []
        self._load_catalog_json()

    def _load_catalog_json(self) -> None:
        json_path = Path(__file__).parent.parent / "data" / "templates.json"
        if not json_path.exists():
            return

        try:
            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            self._catalog_groups = data.get("groups", [])
            raw_templates = data.get("templates", [])

            self._catalog_templates = []
            for tpl_data in raw_templates:
                tpl_id = tpl_data.get("id")
                modality = tpl_data.get("modality", "image")

                template_dict = {
                    **tpl_data,
                    "default_project_configuration": {
                        "labels": tpl_data.get("labels", []),
                        "tools": tpl_data.get("tools", []),
                        "modality": modality,
                    },
                }
                self._templates_by_id[tpl_id] = template_dict
                self._catalog_templates.append(template_dict)
        except Exception as exc:
            print(f"Failed to load templates.json: {exc}")

    async def list_templates(
        self,
        *,
        group: str | None = None,
        modality: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        results = self._catalog_templates
        if group:
            results = [t for t in results if t.get("group") == group]
        if modality:
            results = [t for t in results if t.get("modality") == modality]
        if search:
            q = search.lower()
            results = [
                t
                for t in results
                if q in t.get("title", "").lower()
                or q in t.get("id", "").lower()
                or q in (t.get("description") or "").lower()
            ]
        return results

    async def list_template_groups(self) -> list[str]:
        return self._catalog_groups

    async def get_template(self, template_id: str) -> dict[str, Any] | None:
        return self._templates_by_id.get(template_id)

    async def get_template_by_key(self, key: str) -> dict[str, Any] | None:
        return self._templates_by_id.get(key)



