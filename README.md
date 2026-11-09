# DUT AI Data Platform

A scalable, multi-module modular AI data platform backend and web interface for project management, ontology schema design, dataset asset ingestion, and native annotation workflows.

Annotation runs in the platform's own workspace without a Label Studio service, SDK, or webhook. Label Studio references in editor source comments acknowledge design inspiration or adapted techniques. Historical migrations and legacy database metadata are retained for compatibility; removing the runtime integration does not delete existing annotation data.

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
