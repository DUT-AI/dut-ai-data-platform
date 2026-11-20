from fastapi import APIRouter

from apps.api.routers.snapshot.diff import router as diff_router
from apps.api.routers.snapshot.items import router as items_router
from apps.api.routers.snapshot.snapshots import router as snapshots_router
from apps.api.routers.snapshot.tags import router as tags_router

router = APIRouter()
router.include_router(snapshots_router)
router.include_router(items_router)
router.include_router(diff_router)
router.include_router(tags_router)

__all__ = ["router"]
