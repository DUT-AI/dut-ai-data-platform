from fastapi import APIRouter

from apps.api.routers.project.configurations import router as configurations_router
from apps.api.routers.project.members import router as members_router
from apps.api.routers.project.projects import router as projects_router

router = APIRouter(prefix="/api/v1")
router.include_router(projects_router)
router.include_router(members_router)
router.include_router(configurations_router)

__all__ = ["router"]
