"""Authorization policies used by the Ontology API."""

from apps.api.deps.roles import require_project_role, require_system_role

require_ontology_read = require_project_role("owner", "admin", "annotator", "reviewer")
require_ontology_write = require_project_role("owner", "admin")
require_ontology_catalog_write = require_system_role(
    "admin", "super_admin", "platform_admin"
)

__all__ = [
    "require_ontology_catalog_write",
    "require_ontology_read",
    "require_ontology_write",
]
