# InfraNexus — Testing Guide

> Complete guide for testing the InfraNexus application end-to-end.

---

## Table of Contents

1. [Quick Start](#1-quick-start)
2. [Backend Testing](#2-backend-testing)
3. [Frontend Testing](#3-frontend-testing)
4. [End-to-End Manual Testing](#4-end-to-end-manual-testing)
5. [API Testing with curl](#5-api-testing-with-curl)
6. [Testing with Services Disabled](#6-testing-with-services-disabled)
7. [Testing with Services Enabled](#7-testing-with-services-enabled)
8. [Common Issues & Troubleshooting](#8-common-issues--troubleshooting)

---

## 1. Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- (Optional) Docker for Redis/Meilisearch

### Install Dependencies
```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\Activate    # Windows
# source .venv/bin/activate  # macOS/Linux
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Start the Backend (Services Disabled)
```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
With the default `.env.local` (all services disabled), the backend starts instantly without needing Redis, Kuzu, or Meilisearch.

### Start the Frontend
```bash
cd frontend
npm run dev
```
Open http://localhost:3000 — the app loads with an empty graph canvas.

---

## 2. Backend Testing

### Run Unit Tests
```bash
cd backend
pytest tests/ -v
```

### Run with Coverage
```bash
cd backend
coverage run -m pytest tests/ -v
coverage report --show-missing
```

### Test Structure
```
backend/tests/
├── conftest.py                # Shared fixtures (fake Redis, test client)
├── api/
│   ├── test_graph_api.py      # Graph endpoint tests
│   ├── test_health_api.py     # Health/ready probe tests
│   └── test_search_api.py     # Search endpoint tests
└── unit/
    ├── test_cache_keys.py     # Cache key generation
    ├── test_models.py         # Pydantic model validation
    ├── test_transformer.py    # ETL data transformer
    └── test_validator.py      # sys_id and CI validators
```

### Key Test Fixtures (conftest.py)
- `test_client` — FastAPI TestClient with stub managers
- `fake_redis` — In-memory Redis mock via fakeredis

---

## 3. Frontend Testing

### Run All Tests
```bash
cd frontend
npm test
```

### Run in Watch Mode
```bash
cd frontend
npm run test:watch
```

### Test Structure
```
frontend/src/__tests__/
├── setup.ts                   # Vitest setup (happy-dom)
├── lib/
│   └── (utility tests)
└── store/
    └── graphStore.test.ts     # Zustand store tests (30 tests)
```

### What's Tested
- **graphStore**: Node/edge CRUD, selection, filtering, merge, expand tracking
- **Utility functions**: sys_id validation, text formatting, debounce

### Run Specific Tests
```bash
# Only graph store tests
npm test -- --grep "graphStore"
```

---

## 4. End-to-End Manual Testing

### Scenario 1: App Starts Without Services
**Goal**: Verify the app boots cleanly with all services disabled.

1. Ensure `backend/.env.local` has:
   ```
   KUZU_ENABLED=false
   REDIS_ENABLED=false
   MEILI_ENABLED=false
   ETL_ENABLED=false
   ```
2. Start backend: `uvicorn app.main:app --port 8000 --reload`
3. Verify logs show: `stub_kuzu.initialized`, `stub_redis.initialized`, `stub_meili.initialized`
4. Open http://localhost:8000/docs — Swagger UI loads
5. Open http://localhost:8000/health — returns `{"status": "ok"}`
6. Open http://localhost:8000/ready — returns `{"status": "ready"}` with dependency checks

### Scenario 2: Frontend-Backend Communication
**Goal**: Verify all API calls from frontend reach backend correctly.

1. Start both backend (port 8000) and frontend (port 3000)
2. Open browser DevTools → Network tab
3. Navigate to http://localhost:3000
4. Verify: No 404s in network tab. Expected responses:
   - CORS preflight passes (no `Access-Control-Allow-Origin` errors)
   - Any API calls return proper JSON (even if empty results)

### Scenario 3: Search Flow (With Meilisearch)
**Goal**: Verify search → select → inspect works.

1. Enable Meilisearch + Kuzu + Redis + ETL
2. Run a full ETL sync
3. Type in search bar (press `/` to focus)
4. Verify autocomplete suggestions appear
5. Click a suggestion → graph loads neighborhood
6. Click a node → left panel shows CI Inspector

### Scenario 4: Graph Interaction
**Goal**: Verify graph rendering and interactions work.

1. With data loaded, navigate to the graph page
2. **Click** a node → it selects (highlighted, inspector opens)
3. **Right-click** a node → neighborhood expands (new nodes appear)
4. **Hover** a node → tooltip shows, node scales up
5. **Press `R`** → camera resets
6. **Press `F`** → camera zooms to fit all nodes
7. **Press `1`/`2`/`3`** → hop depth changes
8. **Press `[`/`]`** → panels toggle

### Scenario 5: ETL Sync Flow
**Goal**: Verify ETL pipeline works end-to-end.

1. Enable all services + valid ServiceNow credentials
2. Trigger sync:
   ```bash
   curl -X POST http://localhost:8000/api/etl/sync \
     -H "Content-Type: application/json" \
     -d '{"type": "full"}'
   ```
3. Check status:
   ```bash
   curl http://localhost:8000/api/etl/status
   ```
4. Verify WebSocket receives events (open browser console, check ETL banner)

---

## 5. API Testing with curl

### Health Checks
```bash
# Liveness
curl http://localhost:8000/health

# Readiness (shows service status)
curl http://localhost:8000/ready | python -m json.tool
```

### Graph Endpoints
```bash
# Neighborhood (requires Kuzu + data)
curl "http://localhost:8000/api/graph/neighborhood/abc123def456789...?hops=1&max_nodes=100"

# Stats (works with empty DB — returns zeros)
curl http://localhost:8000/api/graph/stats | python -m json.tool

# Clusters
curl http://localhost:8000/api/graph/clusters | python -m json.tool
```

### Search Endpoints
```bash
# Full-text search (requires Meilisearch)
curl "http://localhost:8000/api/search?q=web+server&limit=10"

# Autocomplete
curl "http://localhost:8000/api/search/suggest?q=web&limit=5"
```

### CI Endpoints
```bash
# CI detail (requires Kuzu + data)
curl http://localhost:8000/api/ci/abc123def456789...

# CI timeline (placeholder)
curl http://localhost:8000/api/ci/abc123def456789.../timeline
```

### ETL Endpoints
```bash
# Status
curl http://localhost:8000/api/etl/status

# Trigger sync (returns 503 when ETL disabled)
curl -X POST http://localhost:8000/api/etl/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}'
```

---

## 6. Testing with Services Disabled

When all services are disabled (default), here's what each endpoint returns:

| Endpoint | Response | Status |
|----------|----------|--------|
| `GET /health` | `{"status": "ok"}` | 200 |
| `GET /ready` | `{"status": "ready", "checks": {...}}` | 200 |
| `GET /api/graph/stats` | All zeros | 200 |
| `GET /api/graph/neighborhood/{id}` | Empty nodes/edges | 200 |
| `GET /api/graph/path/{a}/{b}` | `{"paths": [], "exists": false}` | 200 |
| `GET /api/graph/clusters` | `{"clusters": [], "total_clusters": 0}` | 200 |
| `GET /api/search?q=test` | `{"hits": [], "total": 0}` | 200 |
| `GET /api/search/suggest?q=te` | `{"suggestions": []}` | 200 |
| `GET /api/ci/{id}` | 404 Not Found | 404 |
| `POST /api/etl/sync` | 503 ETL Disabled | 503 |
| `GET /api/etl/status` | `{"status": "idle"}` | 200 |

This behavior is intentional and allows frontend development without backend dependencies.

---

## 7. Testing with Services Enabled

### Via Docker Compose
```bash
# Start Redis + Meilisearch
docker compose up -d redis meilisearch

# Update .env.local
KUZU_ENABLED=true
REDIS_ENABLED=true
MEILI_ENABLED=true
```

### Verify Service Health
```bash
# Redis
redis-cli ping   # PONG

# Meilisearch
curl http://localhost:7700/health   # {"status": "available"}
```

### Full Stack Test
```bash
# 1. Start all services
docker compose up -d

# 2. Start backend
cd backend && uvicorn app.main:app --port 8000 --reload

# 3. Start frontend
cd frontend && npm run dev

# 4. Verify readiness
curl http://localhost:8000/ready
# All checks should be "ready"

# 5. Run ETL
curl -X POST http://localhost:8000/api/etl/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'

# 6. Search for CIs
curl "http://localhost:8000/api/search?q=server&limit=5"
```

---

## 8. Common Issues & Troubleshooting

### `pip install -r requirements.txt` fails
- Ensure you're in the `backend/` directory
- Ensure the virtual environment is activated
- If kuzu fails to build: `pip install kuzu --no-build-isolation`

### Backend won't start — "Address already in use"
```bash
# Find and kill the process on port 8000
netstat -ano | findstr :8000
taskkill /PID <pid> /F
```

### CORS errors in browser
- Verify `CORS_ORIGINS=["http://localhost:3000"]` in `.env.local`
- The frontend must run on exactly `http://localhost:3000`

### Frontend shows "Network Error" for all API calls
- Verify backend is running on port 8000
- Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Verify no firewall blocking localhost connections

### Empty graph canvas (expected when services disabled)
- This is normal. The graph canvas renders without data.
- To see a graph, enable Kuzu + ETL and run a sync with ServiceNow credentials.

### Search returns no results
- If Meilisearch is disabled: expected (stub returns empty)
- If Meilisearch is enabled: check that ETL has run to populate the index
- Verify Meilisearch is accessible: `curl http://localhost:7700/health`

### ETL sync fails
- Check ServiceNow credentials in `.env.local`
- Verify ServiceNow instance URL is correct (include `https://`)
- Check ETL logs: `curl http://localhost:8000/api/etl/status`
- Rate limit: ServiceNow allows ~1.4 req/s — large syncs take time

### TypeScript build errors in frontend
```bash
cd frontend
npm run build
# Fix any type errors shown
```

### Python type errors in backend
```bash
cd backend
mypy app/ etl/ --strict
```
