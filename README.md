# InfraNexus

**ServiceNow CMDB Graph Visualizer** — Ingest 1M+ Configuration Items from ServiceNow, store them in a graph database, and explore relationships as an interactive real-time 3D force-directed graph.

<img width="1710" height="874" alt="{F4A727CF-0229-4D4C-B31A-30E08AE8FE2D}" src="https://github.com/user-attachments/assets/6ccaa495-2c03-43fe-bd3e-9cf03bf19706" />




```
┌──────────────────────────────────────────────────────────────────────┐
│                          InfraNexus                                  │
│                                                                      │
│  Browser (Next.js 15 + React 19 + Three.js)                         │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────────┐   │
│  │  Search Bar │  │   3D Graph       │  │  CI Inspector Panel  │   │
│  │  (Meili)    │  │  ForceGraph3D    │  │  (SWR + Zustand)     │   │
│  └─────────────┘  └──────────────────┘  └──────────────────────┘   │
│            │              │                      │                   │
│            └──────────────┼──────────────────────┘                  │
│                           │ REST + WebSocket                         │
│  ┌────────────────────────▼──────────────────────────────────────┐  │
│  │                  FastAPI (1 uvicorn worker)                    │  │
│  │  /graph/*  /search/*  /ci/*  /etl/*  /health  /ws/etl        │  │
│  └───────┬───────────────┬──────────────────┬────────────────────┘  │
│          │               │                  │                        │
│  ┌───────▼──────┐ ┌──────▼──────┐  ┌───────▼──────┐               │
│  │  Kuzu Graph  │ │  Meilisearch │  │   Redis 7.2  │               │
│  │  (embedded)  │ │   (search)   │  │   (cache)    │               │
│  └──────────────┘ └─────────────┘  └──────────────┘               │
│                                                                      │
│  ETL pipeline pulls from ServiceNow → Kuzu + Meilisearch + Redis    │
└──────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend API | FastAPI + Pydantic v2 | Python 3.12+ |
| Graph DB | Kuzu (embedded, Cypher) | 0.9+ |
| Search | Meilisearch | 1.6 |
| Cache | Redis | 7.2 |
| Frontend | Next.js + React | 15/19 |
| 3D Graph | react-force-graph-3d + Three.js | latest |
| State | Zustand | 5 |
| Data Fetching | SWR | 2 |
| UI | shadcn/ui + Tailwind CSS | v4 |
| ETL | Custom pipeline + APScheduler | — |
| Infra | Docker Compose | — |

## Prerequisites

- **Docker** 24+ and **Docker Compose** v2
- **Node.js** 22+ (for local frontend dev)
- **Python** 3.12+ (for local backend dev)
- A **ServiceNow** instance URL + credentials (for ETL)

## Quickstart

### 1. Clone and configure

```bash
git clone https://github.com/your-org/infranexus.git
cd infranexus
```

Create `backend/.env.local`:

```env
# ServiceNow
SN_INSTANCE_URL=https://your-instance.service-now.com
SN_USERNAME=your_username
SN_PASSWORD=your_password

# Meilisearch
MEILI_MASTER_KEY=change-this-in-production

# Redis
REDIS_URL=redis://redis:6379

# Optional tuning
MAX_NODES_PER_QUERY=2000
ETL_BATCH_SIZE=1000
```

### 2. Start all services

```bash
docker compose up --build -d
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Meilisearch | http://localhost:7700 |
| Redis Insight | http://localhost:5540 |

### 3. Run the ETL pipeline

Trigger an initial full sync via the API:

```bash
curl -X POST http://localhost:8000/etl/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'
```

Or use the ETL status bar in the UI — progress streams live over WebSocket.

### 4. Explore the graph

1. Open http://localhost:3000
2. Press `/` to search for a CI by name or IP address
3. Click a result to load its neighborhood
4. Right-click any node to expand it one more hop
5. Use the right panel (`]`) to filter by node class, edge type, or environment

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Open search |
| `Esc` | Close search / deselect |
| `1` / `2` / `3` | Set hop depth |
| `R` | Reset camera |
| `F` | Zoom to fit |
| `L` | Toggle labels |
| `M` | Toggle minimap |
| `D` | Toggle dark/light |
| `[` | Toggle left (inspector) panel |
| `]` | Toggle right (controls) panel |
| `?` | Keyboard help |

## Project Structure

```
infranexus/
├── backend/                  # FastAPI application
│   ├── app/
│   │   ├── routers/          # graph, search, ci, etl, health
│   │   ├── services/         # kuzu, meilisearch, redis, graph
│   │   ├── models/           # Pydantic schemas
│   │   └── middleware/       # rate limiting, CORS, logging
│   └── etl/                  # ServiceNow ETL pipeline
├── frontend/                 # Next.js application
│   └── src/
│       ├── app/              # App Router pages
│       ├── components/       # graph, panels, search, controls, ui
│       ├── hooks/            # data + behavior hooks
│       ├── store/            # Zustand stores
│       ├── lib/              # api client, utilities
│       └── types/            # TypeScript definitions
├── docs/                     # Architecture documents
└── docker-compose.yml
```

## API Reference

### Graph
| Method | Path | Description |
|--------|------|-------------|
| GET | `/graph/neighborhood/{ci_id}` | k-hop neighborhood (hops 1–3, max 2000 nodes) |
| GET | `/graph/path/{source_id}/{target_id}` | Shortest paths between two CIs |
| GET | `/graph/clusters` | All graph clusters with samples |
| GET | `/graph/stats` | Global graph statistics |

### Search
| Method | Path | Description |
|--------|------|-------------|
| GET | `/search?q=...` | Full-text search with facets |
| GET | `/search/suggest?q=...` | Autocomplete suggestions |

### CI
| Method | Path | Description |
|--------|------|-------------|
| GET | `/ci/{sys_id}` | Full CI detail with relationships |
| GET | `/ci/{sys_id}/timeline` | CI change history |

### ETL
| Method | Path | Description |
|--------|------|-------------|
| POST | `/etl/sync` | Trigger sync (`{"type": "full"\|"incremental"}`) |
| GET | `/etl/status` | ETL status and last sync info |
| WS | `/ws/etl` | Real-time ETL progress stream |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health (ok / degraded / down) |
| GET | `/ready` | Readiness check (all dependency status) |

## Local Development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm test             # Run unit tests (30 tests)
npm run build        # Production build
```

## Performance Notes

- Max 2000 nodes served per neighborhood query (configurable)
- Three.js is dynamically imported (`ssr: false`) — ~700KB never in initial bundle
- All Cypher queries use parameterized values (no string interpolation)
- Redis TTL: neighborhood 300s, CI detail 600s, stats 1800s
- ETL uses APScheduler for incremental syncs (every 6h by default)
- ServiceNow rate limit: ~1.4 req/s with exponential backoff in ETL

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run tests: `npm test` (frontend), `pytest backend/` (backend)
4. Open a pull request against `main`

## License

MIT
