import copy
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from loguru import logger

from modules.project.domain.catalog_interfaces import IProjectCatalogRepository

TEMPLATES_PATH = Path(__file__).parent.parent / "data" / "templates.json"


class TemplateCatalogLoadError(RuntimeError):
    """The template catalog file is missing or malformed."""


@dataclass(frozen=True)
class TemplateCatalog:
    """Parsed template catalog. Loaded once and shared by every request."""

    groups: tuple[str, ...] = ()
    templates: tuple[dict[str, Any], ...] = ()
    by_id: dict[str, dict[str, Any]] = field(default_factory=dict)


class TemplateCatalogLoader:
    """Reads ``templates.json`` from disk. The only place doing catalog I/O."""

    @staticmethod
    def load(path: Path = TEMPLATES_PATH) -> TemplateCatalog:
        try:
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
        except FileNotFoundError as exc:
            raise TemplateCatalogLoadError(f"Template catalog not found: {path}") from exc
        except json.JSONDecodeError as exc:
            raise TemplateCatalogLoadError(
                f"Template catalog is not valid JSON: {path}: {exc}"
            ) from exc

        templates: list[dict[str, Any]] = []
        by_id: dict[str, dict[str, Any]] = {}
        for tpl_data in data.get("templates", []):
            template = {
                **tpl_data,
                "default_project_configuration": {
                    "labels": tpl_data.get("labels", []),
                    "tools": tpl_data.get("tools", []),
                    "modality": tpl_data.get("modality", "image"),
                },
            }
            by_id[template.get("id")] = template
            templates.append(template)

        logger.info("Loaded {} project templates from {}", len(templates), path)
        return TemplateCatalog(
            groups=tuple(data.get("groups", [])),
            templates=tuple(templates),
            by_id=by_id,
        )


class InMemoryProjectCatalogRepository(IProjectCatalogRepository):
    """Read-only access to an already loaded ``TemplateCatalog``.

    The catalog is shared across requests, so every template handed out is a
    deep copy: a caller mutating its result cannot corrupt other requests.
    """

    def __init__(self, catalog: TemplateCatalog) -> None:
        self._catalog = catalog

    async def list_templates(
        self,
        *,
        group: str | None = None,
        modality: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        results = list(self._catalog.templates)
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
        return copy.deepcopy(results)

    async def list_template_groups(self) -> list[str]:
        return list(self._catalog.groups)

    async def get_template(self, template_id: str) -> dict[str, Any] | None:
        template = self._catalog.by_id.get(template_id)
        return copy.deepcopy(template) if template is not None else None

    async def get_template_by_key(self, key: str) -> dict[str, Any] | None:
        return await self.get_template(key)
