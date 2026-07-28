import asyncio

from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from app.auth import auth_router
from app.common import setup_di, setup_exception_handlers
from app.common.health import check_database, check_minio, check_redis
from app.common.telemetry import setup_telemetry
from app.config import settings
from app.ontology.presentation.router import router as ontology_router
from app.project import project_router

app = FastAPI(
    title="DUT AI Data Platform API",
    description="Backend API for DUT AI Data Platform",
    version="0.1.0",
)

# Setup OpenTelemetry Tracing
setup_telemetry(app)

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
app.include_router(ontology_router)


@app.get("/health", tags=["health"])
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}


@app.get("/ready", tags=["health"])
async def readiness_check(response: Response):
    """Dynamic readiness probe checking live health of PostgreSQL, Redis, and MinIO."""
    (
        (db_ok, db_msg),
        (redis_ok, redis_msg),
        (minio_ok, minio_msg),
    ) = await asyncio.gather(
        check_database(),
        check_redis(),
        check_minio(),
    )

    services_status = {
        "database": db_msg,
        "redis": redis_msg,
        "minio": minio_msg,
    }

    all_ready = db_ok and redis_ok and minio_ok

    if not all_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "unhealthy",
            "services": services_status,
        }

    return {
        "status": "ready",
        "services": services_status,
    }
