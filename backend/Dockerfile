# =============================================================================
# Multi-stage Dockerfile for FastAPI Backend Service
# Context: Root monorepo directory (.)
# =============================================================================

# --- Stage 1: Build virtual environment ---
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy workspace configuration & packages
COPY pyproject.toml uv.lock* ./
COPY packages ./packages
COPY backend ./backend

# Sync Python environment (production only)
RUN uv sync --frozen --no-dev || uv sync --no-dev

# --- Stage 2: Final Minimal Runtime Image ---
FROM python:3.12-slim AS runner

WORKDIR /app

# Set Vietnam Timezone & Python environment
ENV TZ=Asia/Ho_Chi_Minh \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Copy virtual environment and source code from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/packages /app/packages
COPY --from=builder /app/backend /app/backend

WORKDIR /app/backend

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
