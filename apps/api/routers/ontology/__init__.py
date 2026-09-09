from fastapi import APIRouter

from apps.api.routers.ontology.categories import router as categories_router
from apps.api.routers.ontology.definitions import router as definitions_router
from apps.api.routers.ontology.inputs import router as inputs_router
from apps.api.routers.ontology.ontologies import router as ontologies_router
from apps.api.routers.ontology.outputs import router as outputs_router
from apps.api.routers.ontology.versions import router as versions_router

router = APIRouter(prefix="/api/v1")
router.include_router(ontologies_router)
router.include_router(definitions_router)
router.include_router(inputs_router)
router.include_router(outputs_router)
router.include_router(categories_router)
router.include_router(versions_router)

__all__ = ["router"]
