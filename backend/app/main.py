from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import auth_router
from app.common import setup_di, setup_exception_handlers
from app.config import settings
from app.project import project_router

app = FastAPI(
    title="DUT AI Data Platform API",
    description="Backend API for DUT AI Data Platform",
    version="0.1.0",
)

# Setup Exception Handlers from app.common.exceptions
setup_exception_handlers(app)

# Setup Dishka Dependency Injection Container from app.common.setup
setup_di(app)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Domain API Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(project_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}


@app.get("/ready", tags=["health"])
async def readiness_check():
    """Readiness probe checking DB & services."""
    return {
        "status": "ready",
        "services": {"database": "ok", "minio": "ok", "redis": "ok"},
    }
