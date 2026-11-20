from fastapi import APIRouter

from apps.api.routers.export.exports import router as export_routes

router = APIRouter()
router.include_router(export_routes)

__all__ = ["router"]
