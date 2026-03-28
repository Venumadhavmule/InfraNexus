# InfraNexus Backend

FastAPI application serving the InfraNexus CMDB Graph API. Powered by Kuzu (embedded graph database), with optional Meilisearch (full-text search) and Redis (caching).

## Architecture

```
backend/
├── app/
│   ├── main.py            # FastAPI app, lifespan, middleware, routers
│   ├── config.py          # Pydantic Settings (single source of truth)
│   ├── dependencies.py    # Dependency injection providers
│   ├── exceptions.py      # Exception hierarchy + global handlers
│   ├── logging.py         # structlog configuration
│   ├── core/              # Infrastructure managers
│   │   ├── kuzu_manager.py    # Kuzu DB lifecycle + reader pool
│   │   ├── redis_manager.py   # Redis async client + msgpack
│   │   ├── meili_manager.py   # Meilisearch client + index bootstrap
│   │   ├── ws_manager.py      # WebSocket connection manager
│   │   └── stubs.py           # No-op stubs (used when services disabled)
│   ├── models/            # Pydantic DTOs (request/response)
│   ├── queries/           # Parameterized Cypher constants (zero injection)
│   ├── routers/           # Thin HTTP layer
│   ├── services/          # Business logic
│   └── middleware/        # Cross-cutting concerns
├── etl/                   # ServiceNow ETL pipeline
│   ├── snow_client.py         # Paginated REST client with backoff
│   ├── transformer.py         # CI/relationship field mapping
│   ├── validator.py           # Input validation rules
│   ├── kuzu_loader.py         # Bulk COPY + MERGE operations
│   ├── meili_indexer.py       # Search index batch upsert
│   ├── state_manager.py       # Redis-persisted sync state
│   ├── runner.py              # Full + incremental sync orchestration
│   └── scheduler.py           # APScheduler cron wrapper
├── tests/                 # pytest test suite (49 tests)
├── pyproject.toml
├── Dockerfile
└── .env.example
```

## Prerequisites

- Python 3.12+
- ServiceNow instance credentials
- **Optionally**: Redis 7.2+ and/or Meilisearch 1.6+ (can run without both)

## Local Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
# For dev tools (pytest, ruff, coverage):
pip install -e ".[dev]"

# Copy env template and fill in credentials
cp .env.example .env.local
```

## Environment Variables

### Feature Toggles

These flags control which external services are active. When set to `false`, a no-op stub is used automatically - the server starts and runs without the real service.

| Variable | Default | Description |
|----------|---------|-------------|
| `KUZU_ENABLED` | `false` | Enable Kuzu graph database (needed for any graph data) |
| `REDIS_ENABLED` | `false` | Enable Redis cache. When off: no caching, rate limiting always passes |
| `MEILI_ENABLED` | `false` | Enable Meilisearch. When off: search falls back to Kuzu full-scan |
| `ETL_ENABLED` | `false` | Enable ETL pipeline scheduler and manual trigger endpoint |

### Minimum Config - Kuzu + ETL, no Redis/Meili

```env
KUZU_ENABLED=true
REDIS_ENABLED=false
MEILI_ENABLED=false
ETL_ENABLED=true

KUZU_DB_PATH=./data/kuzu

SNOW_INSTANCE=https://your-instance.service-now.com
SNOW_USERNAME=your-username
SNOW_PASSWORD=your-password

CORS_ORIGINS=["http://localhost:3000"]
```

### Full Config Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `KUZU_DB_PATH` | `./data/kuzu` | Kuzu database directory (created automatically) |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `MEILI_URL` | `http://localhost:7700` | Meilisearch base URL |
| `MEILI_MASTER_KEY` | `infranexus-dev-key` | Meilisearch master key |
| `SNOW_INSTANCE` | - | ServiceNow instance URL (required when ETL enabled) |
| `SNOW_USERNAME` | - | ServiceNow username |
| `SNOW_PASSWORD` | - | ServiceNow password |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `LOG_FORMAT` | `json` | `json` (structured) or `console` (human-readable) |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins (JSON array) |
| `RATE_LIMIT_PER_MIN` | `100` | Requests per IP per minute (no-op when Redis off) |
| `CACHE_NEIGHBORHOOD_TTL` | `300` | Neighborhood cache TTL seconds |
| `CACHE_CI_TTL` | `600` | CI detail cache TTL seconds |
| `CACHE_SEARCH_TTL` | `60` | Search cache TTL seconds |
| `ETL_SYNC_INTERVAL_MIN` | `30` | Incremental sync interval in minutes |
| `MAX_NODES_DEFAULT` | `500` | Default max nodes per neighborhood response |
| `MAX_NODES_LIMIT` | `2000` | Hard limit on nodes (never load full graph) |
| `DEGREE_THRESHOLD_DEFAULT` | `50` | Default hub-suppression threshold |

## Running the Server

```bash
# Must use exactly 1 worker - Kuzu is single-process embedded
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1

# Development with auto-reload
uvicorn app.main:app --reload --workers 1
```

## Loading Data from ServiceNow

Once the server is running, trigger a full sync via the API:

```bash
curl -X POST http://localhost:8000/api/etl/sync
```

The sync will:
1. Reset the Kuzu schema (drops and recreates CI + RELATES_TO tables)
2. Fetch all 40+ CI classes from `cmdb_ci` (paginated, 1000/page)
3. Bulk-load CIs via Kuzu COPY
4. Fetch all relationships from `cmdb_rel_ci`
5. Filter out relationships with missing endpoints (referential integrity)
6. Bulk-load relationships via Kuzu COPY
7. Update degree counts for all CIs
8. Index CIs in Meilisearch (if enabled)
9. Invalidate Redis cache (if enabled)

Monitor progress via:

```bash
# Current status
curl http://localhost:8000/api/etl/status

# Recent log entries
curl http://localhost:8000/api/etl/logs

# Graph statistics after sync
curl http://localhost:8000/api/graph/stats
```

Or connect to the WebSocket for real-time events: `ws://localhost:8000/ws/etl`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness probe (checks active services) |
| `GET` | `/api/graph/neighborhood/{ci_id}` | k-hop neighborhood subgraph (max 2000 nodes) |
| `GET` | `/api/graph/path/{source}/{target}` | Shortest paths between two CIs |
| `GET` | `/api/graph/clusters` | Cluster summaries |
| `GET` | `/api/graph/stats` | Graph-wide statistics (node/edge counts, distributions) |
| `GET` | `/api/ci/{ci_id}` | Full CI detail |
| `GET` | `/api/ci/{ci_id}/timeline` | CI change timeline |
| `GET` | `/api/search?q=...` | Full-text search (Meilisearch or Kuzu fallback) |
| `GET` | `/api/search/suggest?q=...` | Autocomplete suggestions |
| `POST` | `/api/etl/sync` | Trigger ETL sync (incremental or full) |
| `GET` | `/api/etl/status` | Current ETL status |
| `GET` | `/api/etl/logs` | Recent ETL logs |
| `WS` | `/ws/etl` | ETL progress events (Server-Sent via WebSocket) |

Browse the auto-generated docs at http://localhost:8000/docs

## Testing

```bash
# All tests (49 passing)
pytest tests/ -v

# Unit tests only
pytest tests/unit/ -v

# API contract tests (uses stubs, no real DB)
pytest tests/api/ -v

# With coverage
pytest --cov=app --cov=etl --cov-report=term-missing
```

## Stub System (Feature Toggles)

Each service has a no-op stub in `app/core/stubs.py`:

| Service | When disabled | Behavior |
|---------|--------------|---------|
| Redis (`StubRedisManager`) | `REDIS_ENABLED=false` | Cache misses, rate limits pass, state returns None |
| Meilisearch (`StubMeiliManager`) | `MEILI_ENABLED=false` | Search falls back to Kuzu `CONTAINS` query |
| Kuzu (`StubKuzuManager`) | `KUZU_ENABLED=false` | All reads return `[]`, writes are no-ops |

Stubs implement identical interfaces so code paths remain unchanged.

## Key Design Decisions

- **Single uvicorn worker**: Kuzu is an embedded, single-writer database
- **Parameterized Cypher only**: All queries in `queries/` module - no string interpolation
- **msgpack for Redis**: 2-3x smaller payload vs JSON
- **COPY HEADER=TRUE PARALLEL=FALSE**: Required for Kuzu 0.11 with real-world CSV data containing newlines
- **Relationship referential integrity**: Bulk-load filters out edges where either endpoint wasn't loaded
- **SysId validated at boundary**: 32-char lowercase hex enforced by Pydantic type alias

