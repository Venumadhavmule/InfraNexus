---
applyTo: "backend/**"
---

# InfraNexus Backend Skill

You are an expert backend engineer building the InfraNexus ServiceNow CMDB Graph Visualizer backend.

## Project Context

InfraNexus is a full-stack application that renders ServiceNow CMDB Configuration Items (CIs) and their relationships as an interactive 3D WebGL force-directed graph. The backend is a FastAPI service with Kuzu (embedded graph DB), Redis (cache), and Meilisearch (search).

## Technology Stack

- **Framework**: FastAPI (Python 3.12+)
- **Graph DB**: Kuzu (embedded, Cypher queries)
- **Cache**: Redis 7.2 (aioredis)
- **Search**: Meilisearch 1.6+
- **Scheduler**: APScheduler
- **Validation**: Pydantic v2
- **Logging**: structlog
- **Testing**: pytest + pytest-asyncio

## Architecture Rules

### Kuzu (Graph Database)
- Kuzu is **embedded** — runs in the same process as FastAPI
- **Single writer** constraint: Use `asyncio.Lock()` for all write operations
- Use a **reader connection pool** (4 connections matching CPU cores) for concurrent reads
- All Cypher queries MUST be **parameterized** — never use string interpolation (SQL injection equivalent)
- Use `COPY` command for bulk loading (not individual INSERT)
- Primary key on `sys_id` (STRING, 32 hex chars)
- Pre-compute `degree` and `cluster_id` on CI nodes during ETL

### Redis (Cache)
- Cache key pattern: `{type}:{identifier}:{params_hash}`
  - Neighborhoods: `nb:{ci_id}:{hops}:{filter_hash}` TTL: 300s
  - CI details: `ci:{ci_id}` TTL: 600s
  - Search: `search:{query_hash}` TTL: 60s
- **Read-through** cache strategy: check cache first, query on miss, cache result
- Use **msgpack** for cache serialization (smaller than JSON)
- Cache invalidation on ETL sync: delete affected CI neighborhoods
- Rate limiting via Redis sorted sets (sliding window)

### Meilisearch (Search)
- Index name: `cmdb-cis`
- Primary key: `sys_id`
- Searchable: name, short_description, class_label, ip_address
- Filterable: class, class_label, environment, operational_status, company, location
- Sortable: name, sys_updated_on
- Typo tolerance enabled

### API Design Patterns
- All endpoints return Pydantic models (strict validation)
- Use FastAPI dependency injection via `Depends()` for Kuzu, Redis, Meilisearch access
- Async handlers for all I/O operations
- `Server-Timing` header on every response with query duration
- `X-Request-ID` header injected by middleware (uuid4)
- Rate limiting: 100 req/min per IP (sliding window via Redis)

### ETL Pipeline
- ServiceNow API rate limit: ~1.4 req/s with exponential backoff
- Page size: 1000 records per request
- Fields to fetch are explicitly specified per table (not `*`)
- Incremental sync uses `sys_updated_on >= last_sync` filter
- Transform raw Snow records to canonical format before loading
- Validate: sys_id format (32 hex), required fields, status ranges
- Full sync writes CSVs then uses Kuzu COPY; incremental uses MERGE
- Sync state stored in Redis: `etl:state` hash

### Neighborhood Query (Critical Path)
```cypher
-- Always include degree_threshold to prevent super-node explosion
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..$hops]-(neighbor:CI)
WHERE neighbor.degree < $degree_threshold
RETURN center, r, neighbor
LIMIT $max_nodes;
```

### Error Handling
- Custom exception hierarchy: `InfraNexusError` → `CINotFoundError`, `KuzuQueryError`, etc.
- Global exception handler maps exceptions to HTTP status codes
- Never expose internal errors to clients — wrap in generic message
- Log errors with structlog including request_id for correlation

### Code Style
- Use type hints everywhere
- `async def` for all I/O handlers
- Pydantic `BaseModel` for all request/response schemas
- `from __future__ import annotations` for forward references
- Group imports: stdlib, third-party, local (separated by blank lines)
- No wildcard imports

### ServiceNow CMDB Model
- CIs are nodes: 40+ classes inheriting from `cmdb_ci`
- Relationships are directed edges: parent → child semantic
- Key classes: Server, VM, Database, Application, Service, Load Balancer, Network, K8s, Container
- Key relationship types: Runs on, Hosted on, Depends on, Contains, Members of, Connected by
- `sys_id` is the universal identifier (32 lowercase hex chars)
- `sys_class_name` determines the CI type
- `operational_status`: 1=Operational, 2=Non-Operational, 3=Repair, 4=Retired
- `environment`: production, development, test, staging, QA, DR

## File Organization

```
backend/
├── app/
│   ├── main.py              # FastAPI app + lifespan
│   ├── config.py            # Pydantic Settings (env vars)
│   ├── dependencies.py      # DI providers
│   ├── core/                # Infrastructure managers
│   ├── models/              # Pydantic schemas
│   ├── routers/             # API route handlers
│   ├── services/            # Business logic
│   └── middleware/           # Request processing
└── etl/                     # ServiceNow ETL pipeline
```

## Common Patterns

### Dependency Injection
```python
async def get_kuzu(request: Request) -> KuzuManager:
    return request.app.state.kuzu

@router.get("/neighborhood/{ci_id}")
async def get_neighborhood(ci_id: str, kuzu: KuzuManager = Depends(get_kuzu)):
    ...
```

### Cache Pattern
```python
async def get_with_cache(cache: Redis, key: str, ttl: int, fetch_fn):
    cached = await cache.get(key)
    if cached:
        return msgpack.unpackb(cached)
    result = await fetch_fn()
    await cache.set(key, msgpack.packb(result), ex=ttl)
    return result
```

### Kuzu Query Pattern
```python
async def query_neighborhood(self, ci_id: str, hops: int, max_nodes: int):
    cypher = """
    MATCH (c:CI {sys_id: $ci_id})-[r:RELATES_TO*1..$hops]-(n:CI)
    WHERE n.degree < $threshold
    RETURN c, r, n LIMIT $limit
    """
    return await self.kuzu.read_query(cypher, {
        'ci_id': ci_id, 'hops': hops, 
        'threshold': 100, 'limit': max_nodes
    })
```

## Testing Requirements
- Every service method has a unit test
- Every router endpoint has an API test (FastAPI TestClient)
- Kuzu queries tested with temporary test database (tmp_path fixture)
- ETL transformers/validators tested with sample ServiceNow records
- Cache operations tested with mock Redis or fakeredis
