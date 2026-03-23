# InfraNexus — Copilot Instructions

## Project Overview

InfraNexus is a **ServiceNow CMDB Graph Visualizer** — a full-stack application that renders Configuration Items (CIs) and their relationships as an interactive 3D WebGL force-directed graph. It ingests 1M+ CIs from ServiceNow, stores them in Kuzu (embedded graph DB), indexes them in Meilisearch, caches with Redis, and renders 3D graphs in the browser using Three.js.

## Monorepo Structure

```
infranexus/
├── backend/          # FastAPI (Python 3.12+)
│   ├── app/          # API: routers, services, models, middleware
│   └── etl/          # ServiceNow ETL pipeline
├── frontend/         # Next.js 15 (TypeScript, React 19)
│   └── src/          # components, hooks, stores, lib, types
├── docs/             # Architecture documents
└── docker-compose.yml
```

## Critical Constraints

1. **Kuzu is embedded (single-process)**. Never suggest multi-worker FastAPI. Use exactly 1 uvicorn worker.
2. **Never load full graph to frontend**. Always serve subgraphs (k-hop neighborhoods). Max 2000 nodes.
3. **Three.js must be dynamically imported**. It's ~700KB. Never include in initial bundle. Always `ssr: false`.
4. **All Cypher queries must be parameterized**. Never use string interpolation in Kupher queries.
5. **ServiceNow rate limit**: ~1.4 req/s. Always use exponential backoff in ETL.
6. **sys_id format**: 32 lowercase hex characters. Always validate.

## Tech Stack Quick Reference

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI + Pydantic v2 |
| Graph DB | Kuzu (embedded, Cypher) |
| Cache | Redis 7.2 |
| Search | Meilisearch 1.6 |
| Frontend | Next.js 15 + React 19 |
| 3D Graph | react-force-graph-3d + Three.js |
| State | Zustand |
| Data Fetch | SWR |
| UI | shadcn/ui + Tailwind CSS 4 |
| ETL | Custom pipeline + APScheduler |
| Infra | Docker Compose |

## Code Style

### Python (Backend)
- Type hints on all functions
- `async def` for all I/O
- Pydantic BaseModel for all schemas
- structlog for logging
- No wildcard imports
- Imports grouped: stdlib → third-party → local

### TypeScript (Frontend)
- Strict mode enabled
- Functional components only
- Custom hooks for data logic
- Zustand for client state, SWR for server state
- Never use `any` — define proper types in `types/`
- Use `Map<string, T>` for node/edge collections (O(1) lookup)

## ServiceNow Domain Model

- **CIs** are graph nodes (40+ classes: Server, VM, DB, App, Service, LB, Network, K8s, Container, etc.)
- **Relationships** are directed edges (40+ types: Runs on, Depends on, Contains, Hosted on, etc.)
- **sys_id** is the universal 32-hex-char identifier
- **sys_class_name** determines CI type
- **sys_updated_on** enables incremental sync
- **operational_status**: 1=Operational, 2=Non-Op, 3=Repair, 4=Retired

## Key Architecture Documents

- `docs/BACKEND_PLAN.md` — Complete backend architecture
- `docs/FRONTEND_PLAN.md` — Complete frontend architecture
- `docs/PRODUCT_PLAN.md` — Full product specification
- `docs/FEATURES.md` — Feature list and required skills
