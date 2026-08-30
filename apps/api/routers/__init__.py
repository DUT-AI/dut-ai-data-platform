from apps.api.routers.annotation import router as annotation_router
from apps.api.routers.dataset import router as dataset_router
from apps.api.routers.identity import router as identity_router
from apps.api.routers.ontology import router as ontology_router
from apps.api.routers.project import router as project_router
from apps.api.routers.project_catalog import router as project_catalog_router

__all__ = [
    "annotation_router",
    "dataset_router",
    "identity_router",
    "ontology_router",
    "project_catalog_router",
    "project_router",
]
