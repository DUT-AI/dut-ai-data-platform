from fastapi import APIRouter

from apps.api.routers.annotation.annotations import router as annotations_router
from apps.api.routers.annotation.asset_annotations import (
    router as asset_annotations_router,
)
from apps.api.routers.annotation.revisions import router as revisions_router

router = APIRouter(prefix="/api/v1")
router.include_router(asset_annotations_router)
router.include_router(annotations_router)
router.include_router(revisions_router)

__all__ = ["router"]
