# =============================================================================
# Multi-stage Dockerfile for AI / GPU Inference Worker
# Context: Root workspace directory (.)
# =============================================================================

# --- Stage 1: Build virtual environment with CUDA / PyTorch extra dependencies ---
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

COPY pyproject.toml uv.lock* ./

# Install core dependencies PLUS the optional [ai] extra (PyTorch, torchvision, ultralytics...)
RUN uv sync --extra ai --no-dev

# --- Stage 2: GPU Runtime Image ---
FROM python:3.12-slim AS runner

WORKDIR /app

# Install system libraries needed by OpenCV / PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Ho_Chi_Minh \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH="/app" \
    PATH="/app/.venv/bin:$PATH"

RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

COPY --from=builder /app/.venv /app/.venv

# Copy core, modules and ai_worker application code
COPY core ./core
COPY modules ./modules
COPY apps/ai_worker ./apps/ai_worker

CMD ["python", "apps/ai_worker/main.py"]
