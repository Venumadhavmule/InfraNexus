# InfraNexus - Disabled Features Reference

> **Purpose**: Documents all features that are currently disabled via feature toggles, why they were disabled, and exact steps to re-enable each one.

---

## Feature Toggle Summary

| Feature | Config Flag | Default | Why Disabled |
|---------|-------------|---------|-------------|
| Kuzu Graph DB | `KUZU_ENABLED` | `false` | Requires Kuzu binary and local DB directory. Not needed for frontend development. |
| Redis Cache | `REDIS_ENABLED` | `false` | Requires running Redis server. App works without caching (all requests hit DB directly). |
| Meilisearch | `MEILI_ENABLED` | `false` | Requires running Meilisearch instance. Search returns empty results until enabled. |
| ETL Pipeline | `ETL_ENABLED` | `false` | Requires all three services above + valid ServiceNow credentials. |

---

## 1. Kuzu Graph Database

### What It Does (When Enabled)
- Stores CI nodes (Configuration Items) and RELATES_TO edges in an embedded graph database
- Serves k-hop neighborhood traversals via Cypher queries
- Provides shortest-path computation between any two CIs
- Computes graph statistics (node count, edge count, degree distribution)

### What Happens When Disabled
- All graph queries return **empty results** (empty node/edge lists)
- Neighborhood endpoint returns `{ nodes: [], edges: [], truncated: false }`
- CI detail endpoint returns `CINotFoundError` (404) for any sys_id
- Path endpoint returns `{ paths: [], exists: false }`
- Stats endpoint returns all zeros
- **The app still starts and responds to all API calls** - just with no graph data

### How to Re-Enable
1. Ensure Python `kuzu>=0.7.0` is installed (`pip install -r requirements.txt` covers this)
2. Set in `backend/.env.local`:
   ```
   KUZU_ENABLED=true
   KUZU_DB_PATH=./data/kuzu
   ```
3. Restart the backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. The schema is auto-created on first startup
5. To populate data, also enable ETL and run a sync

---

## 2. Redis Cache

### What It Does (When Enabled)
- Caches neighborhood query results (TTL: 300s)
- Caches CI detail lookups (TTL: 600s)
- Caches search results (TTL: 60s)
- Provides sliding-window rate limiting per client IP
- Stores ETL pipeline state (current sync status, last sync timestamp)

### What Happens When Disabled
- **Cache always misses** - every request hits the database (or stub) directly
- **Rate limiting is bypassed** - all requests are allowed (middleware gracefully skips)
- **ETL state is not persisted** - ETL status always shows "idle"
- No performance degradation beyond the missing cache layer

### How to Re-Enable
1. Start a Redis server:
   ```bash
   # Via Docker:
   docker run -d --name redis -p 6379:6379 redis:7.2-alpine
   ```
2. Set in `backend/.env.local`:
   ```
   REDIS_ENABLED=true
   REDIS_URL=redis://localhost:6379/0
   ```
3. Restart the backend

---

## 3. Meilisearch Full-Text Search

### What It Does (When Enabled)
- Full-text search across CI names, descriptions, IP addresses, FQDNs
- Autocomplete suggestions with typo tolerance
- Faceted filtering by class, environment, operational status
- Highlighted search results

### What Happens When Disabled
- Search endpoint returns `{ hits: [], total: 0 }`
- Suggest endpoint returns `{ suggestions: [] }`
- The search UI on the frontend shows "No results found" for any query
- **No errors** - the API responds normally, just with empty results

### How to Re-Enable
1. Start a Meilisearch instance:
   ```bash
   # Via Docker:
   docker run -d --name meilisearch -p 7700:7700 \
     -e MEILI_MASTER_KEY=infranexus-dev-key \
     getmeili/meilisearch:v1.6
   ```
2. Set in `backend/.env.local`:
   ```
   MEILI_ENABLED=true
   MEILI_URL=http://localhost:7700
   MEILI_MASTER_KEY=infranexus-dev-key
   ```
3. Restart the backend
4. Run an ETL sync to populate the search index

---

## 4. ETL Pipeline (ServiceNow Sync)

### What It Does (When Enabled)
- Full sync: Bulk-ingests all CIs and relationships from ServiceNow CMDB
- Incremental sync: Delta sync using `sys_updated_on` timestamps
- Validates and transforms raw ServiceNow data
- Loads data into Kuzu and indexes into Meilisearch
- Broadcasts sync progress via WebSocket
- Runs on a schedule (default: every 30 minutes)

### What Happens When Disabled
- POST `/api/etl/sync` returns HTTP 503 "ETL is disabled"
- GET `/api/etl/status` returns `{ status: "idle" }` with no sync history
- The scheduler does not start
- WebSocket connections still work but receive no ETL events

### Prerequisites for Re-Enabling
ETL requires **all three services** (Kuzu, Redis, Meilisearch) to be enabled, plus valid ServiceNow credentials.

### How to Re-Enable
1. Enable all three services (see sections above)
2. Set in `backend/.env.local`:
   ```
   ETL_ENABLED=true
   SNOW_INSTANCE=https://your-instance.service-now.com
   SNOW_USERNAME=your_username
   SNOW_PASSWORD=your_password
   ```
3. Restart the backend
4. Trigger a full sync:
   ```bash
   curl -X POST http://localhost:8000/api/etl/sync \
     -H "Content-Type: application/json" \
     -d '{"type": "full"}'
   ```

---

## Enabling All Services at Once

To enable the complete production stack:

```env
# backend/.env.local
KUZU_ENABLED=true
REDIS_ENABLED=true
MEILI_ENABLED=true
ETL_ENABLED=true

KUZU_DB_PATH=./data/kuzu
REDIS_URL=redis://localhost:6379/0
MEILI_URL=http://localhost:7700
MEILI_MASTER_KEY=infranexus-dev-key
SNOW_INSTANCE=https://your-instance.service-now.com
SNOW_USERNAME=your_username
SNOW_PASSWORD=your_password
```

Or use Docker Compose which starts Redis and Meilisearch automatically:

```bash
docker compose up -d
```

---

## Architecture Note

The stub implementations are in `backend/app/core/stubs.py`. They implement the same interface as the real managers but return empty/no-op results. This allows the entire API surface to remain available and testable without requiring external services.
