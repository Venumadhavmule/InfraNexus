# InfraNexus Backend

FastAPI application serving the InfraNexus CMDB Graph API. Powered by Kuzu (embedded graph database), Meilisearch (full-text search), and Redis (caching).

## Architecture

```
backend/
├── app/
│   ├── main.py            # FastAPI app, lifespan, middleware, routers
│   ├── config.py           # Pydantic Settings (single source of truth)
│   ├── dependencies.py     # Dependency injection providers
│   ├── exceptions.py       # Exception hierarchy + global handlers
│   ├── logging.py          # structlog configuration
│   ├── core/               # Infrastructure managers
│   │   ├── kuzu_manager.py     # Kuzu DB lifecycle + reader pool
│   │   ├── redis_manager.py    # Redis async client + msgpack
│   │   ├── meili_manager.py    # Meilisearch client + index bootstrap
│   │   └── ws_manager.py       # WebSocket connection manager
│   ├── models/             # Pydantic DTOs (request/response)
│   │   ├── base.py             # SysId type, TimestampedMixin, ErrorResponse
│   │   ├── graph.py            # GraphNode, GraphEdge, NeighborhoodResponse
│   │   ├── ci.py               # CIDetail, CITimelineResponse
│   │   ├── search.py           # SearchHit, SearchResponse, SuggestResponse
│   │   ├── etl.py              # SyncRequest, ETLStatusResponse
│   │   └── health.py           # HealthResponse, ReadyResponse
│   ├── queries/            # Parameterized Cypher constants (zero injection)
│   │   ├── neighborhood.py
│   │   ├── path.py
│   │   ├── stats.py
│   │   └── ci.py
│   ├── routers/            # Thin HTTP layer
│   │   ├── graph.py            # /api/graph/*
│   │   ├── ci.py               # /api/ci/*
│   │   ├── search.py           # /api/search/*
│   │   ├── etl.py              # /api/etl/*
│   │   ├── health.py           # /health, /ready
│   │   └── ws.py               # /ws/etl
│   ├── services/           # Business logic
│   │   ├── graph_service.py
│   │   ├── ci_service.py
│   │   ├── search_service.py
│   │   ├── cache_service.py
│   │   └── layout_service.py
│   └── middleware/          # Cross-cutting concerns
│       ├── request_id.py
│       ├── timing.py
│       └── rate_limit.py
├── etl/                    # ServiceNow ETL pipeline
│   ├── snow_client.py          # Paginated REST client with backoff
│   ├── transformer.py          # CI/relationship field mapping
│   ├── validator.py            # Input validation rules
│   ├── kuzu_loader.py          # Bulk COPY + MERGE operations
│   ├── meili_indexer.py        # Search index batch upsert
│   ├── state_manager.py        # Redis-persisted sync state
│   ├── runner.py               # Full + incremental sync orchestration
│   └── scheduler.py            # APScheduler cron wrapper
├── tests/                  # pytest test suite
├── pyproject.toml
├── Dockerfile
└── .env.example
```

## Quickstart

```bash
# Start all services
docker compose up -d

# Or run locally (requires Redis + Meilisearch)
cd backend
cp .env.example .env.local
pip install -e ".[dev]"
uvicorn app.main:app --reload --workers 1
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KUZU_DB_PATH` | `./data/kuzu` | Kuzu database directory |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `MEILI_URL` | `http://localhost:7700` | Meilisearch URL |
| `MEILI_MASTER_KEY` | `infranexus-dev-key` | Meilisearch master key |
| `SNOW_INSTANCE` | — | ServiceNow instance URL |
| `SNOW_USERNAME` | — | ServiceNow username |
| `SNOW_PASSWORD` | — | ServiceNow password |
| `LOG_LEVEL` | `INFO` | Logging level |
| `LOG_FORMAT` | `json` | `json` or `console` |
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins |
| `RATE_LIMIT_PER_MIN` | `100` | Rate limit per IP per minute |
| `CACHE_NEIGHBORHOOD_TTL` | `300` | Neighborhood cache TTL (seconds) |
| `CACHE_CI_TTL` | `600` | CI detail cache TTL (seconds) |
| `CACHE_SEARCH_TTL` | `60` | Search cache TTL (seconds) |
| `ETL_SYNC_INTERVAL_MIN` | `30` | Incremental sync interval (minutes) |
| `MAX_NODES_DEFAULT` | `500` | Default max nodes in neighborhood |
| `MAX_NODES_LIMIT` | `2000` | Hard ceiling for max nodes |
| `DEGREE_THRESHOLD_DEFAULT` | `50` | Default degree filter threshold |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness probe |
| `GET` | `/ready` | Readiness probe (checks Kuzu, Redis, Meilisearch) |
| `GET` | `/api/graph/neighborhood/{ci_id}` | k-hop neighborhood subgraph |
| `GET` | `/api/graph/path/{source}/{target}` | Shortest paths between CIs |
| `GET` | `/api/graph/clusters` | Cluster summaries |
| `GET` | `/api/graph/stats` | Graph-wide statistics |
| `GET` | `/api/ci/{ci_id}` | Full CI detail |
| `GET` | `/api/ci/{ci_id}/timeline` | CI change timeline |
| `GET` | `/api/search?q=...` | Full-text search |
| `GET` | `/api/search/suggest?q=...` | Autocomplete suggestions |
| `POST` | `/api/etl/sync` | Trigger ETL sync |
| `GET` | `/api/etl/status` | Current ETL status |
| `GET` | `/api/etl/logs` | Recent ETL logs |
| `WS` | `/ws/etl` | ETL progress events |

## Testing

```bash
# Unit tests
pytest tests/unit/ -v

# API contract tests
pytest tests/api/ -v

# All tests with coverage
pytest --cov=app --cov=etl --cov-report=term-missing
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Neighborhood (cached) | < 10ms |
| Neighborhood (uncached) | < 100ms |
| Search | < 50ms |
| Suggest | < 30ms |
| CI Detail | < 20ms |
| Health check | < 5ms |

## Key Design Decisions

- **Single uvicorn worker**: Kuzu is embedded (single-process constraint)
- **Parameterized Cypher only**: All queries in `queries/` module — zero injection risk
- **msgpack for Redis**: 2-3x smaller than JSON serialization
- **5-layer cache**: neighborhood, CI detail, search, ETL state, rate limit
- **SysId type alias**: Validates 32-hex pattern at Pydantic boundary
- **Service-per-domain**: graph, CI, search, cache — clear ownership
