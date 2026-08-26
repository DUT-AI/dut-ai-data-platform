# DUT AI Data Platform

A scalable, multi-module modular AI data platform backend and web interface for project management, ontology schema design, dataset asset ingestion, and annotation workflows (including Label Studio integration).

## Architecture

- **Multi-Module Monolith Structure**:
  - `core/`: Shared platform infrastructure (Database, Storage, Security, Config, Telemetry, Exceptions, Utils)
  - `modules/`: Decoupled business domain modules (`identity`, `project`, `ontology`, `dataset`, `annotation`)
  - `apps/`: Deployable applications (`api`, `worker`, `cli`)
  - `migrations/`: Unified Alembic database migrations
  - `web/`: Next.js frontend application

## Quickstart

```bash
# Run database & dependencies
docker compose up -d

# Run migrations
make migrate

# Start FastAPI dev server
make dev-api

# Run test suite
make test
```
