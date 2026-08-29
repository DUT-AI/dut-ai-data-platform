import asyncio

import uvicorn
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware

from apps.api.di import setup_di
from apps.api.health import check_database, check_minio, check_redis
from apps.api.routers import (
    annotation_router,
    dataset_router,
    identity_router,
    ontology_router,
    project_router,
    users_router,
)
from core.config import settings
from core.exceptions import setup_exception_handlers
from core.telemetry import setup_telemetry

app = FastAPI(
    title="DUT AI Data Platform API",
    description="Multi-Module Modular Backend API for DUT AI Data Platform",
    version="0.1.0",
)

# 1. Setup OpenTelemetry Tracing & Logging
setup_telemetry(app)

# 2. Setup Exception Handlers
setup_exception_handlers(app)

# 3. Setup Dishka Dependency Injection Container
setup_di(app)


class AppCORSMiddleware(CORSMiddleware):
    """Enhanced CORS Middleware supporting all local development ports."""

    def is_allowed_origin(self, origin: str) -> bool:
        if super().is_allowed_origin(origin):
            return True
        # Automatically allow any local dev port on localhost, 127.0.0.1, or [::1]
        return origin.startswith(
            ("http://localhost:", "http://127.0.0.1:", "http://[::1]:")
        ) or origin in ("http://localhost", "http://127.0.0.1", "http://[::1]")


# 4. Configure CORS Middleware
app.add_middleware(
    AppCORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Register Application Routers
app.include_router(identity_router)
app.include_router(users_router)
app.include_router(project_router)
app.include_router(ontology_router)
app.include_router(dataset_router)
app.include_router(annotation_router)


# 6. Health & Readiness Probes
@app.get("/health", tags=["health"])
async def health_check():
    """Simple liveness probe endpoint."""
    return {"status": "ok", "version": "0.1.0"}


@app.get("/ready", tags=["health"])
async def readiness_check(response: Response):
    """Readiness probe checking live status of PostgreSQL, Redis, and MinIO."""
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


if __name__ == "__main__":
    uvicorn.run(
        "apps.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
    )
