from fastapi import APIRouter

from apps.api.routers.dataset.assets import router as assets_router
from apps.api.routers.dataset.datasets import router as datasets_router
from apps.api.routers.dataset.versions import router as versions_router

router = APIRouter(prefix="/api/v1")
router.include_router(datasets_router)
router.include_router(versions_router)
router.include_router(assets_router)

__all__ = ["router"]
