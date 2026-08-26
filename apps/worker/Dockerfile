# =============================================================================
# Multi-stage Dockerfile for Background Task Worker
# Context: Root workspace directory (.)
# =============================================================================

# --- Stage 1: Build virtual environment ---
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock* ./

# Install core dependencies PLUS the optional [worker] extra (ARQ / Celery)
RUN uv sync --extra worker --no-dev

# --- Stage 2: Final Minimal Runtime Image ---
FROM python:3.12-slim AS runner

WORKDIR /app

ENV TZ=Asia/Ho_Chi_Minh \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH="/app" \
    PATH="/app/.venv/bin:$PATH"

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /app/.venv /app/.venv

COPY core ./core
COPY modules ./modules
COPY apps/worker ./apps/worker

CMD ["python", "apps/worker/main.py"]
