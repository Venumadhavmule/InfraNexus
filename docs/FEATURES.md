# InfraNexus — Features & Required Skills

---

## Part 1: Complete Feature List

### Core Features (MVP)

| # | Feature | Description | Complexity |
|---|---------|-------------|------------|
| 1 | **3D Graph Rendering** | Interactive WebGL force-directed graph using Three.js + react-force-graph-3d | High |
| 2 | **CI Node Visualization** | Custom 3D meshes per CI class (13+ shapes/colors) with size scaling by degree | Medium |
| 3 | **Edge Visualization** | Directional arrows, colored by relationship type, solid/dashed styles | Medium |
| 4 | **k-Hop Neighborhood** | Expand 1/2/3 hops around any CI with super-node guards (degree threshold) | High |
| 5 | **Full-Text Search** | Search CIs by name, IP, description, class via Meilisearch with typo tolerance | Medium |
| 6 | **Autocomplete** | Prefix-based instant suggestions (< 30ms) as user types | Low |
| 7 | **CI Inspector Panel** | Side panel showing all attributes of selected CI | Low |
| 8 | **Relationship List** | Incoming/outgoing relationships for selected CI | Low |
| 9 | **Node Type Filtering** | Toggle CI class visibility (checkboxes for Server, DB, App, etc.) | Low |
| 10 | **Environment Filtering** | Filter by production/development/test/staging | Low |
| 11 | **ETL: Full Sync** | Bulk ingest all CIs + relationships from ServiceNow into Kuzu + Meilisearch | High |
| 12 | **ETL: Incremental Sync** | Delta sync using `sys_updated_on` — only changed records | High |
| 13 | **Redis Caching** | Read-through cache for neighborhoods, CI details, search results | Medium |
| 14 | **Camera Animation** | Smooth fly-to when selecting/searching a CI | Low |
| 15 | **Dark/Light Theme** | Full theme support with consistent CI colors across themes | Low |
| 16 | **Docker Compose** | One-command dev environment (backend + frontend + Redis + Meilisearch) | Medium |

### Extended Features

| # | Feature | Description | Complexity |
|---|---------|-------------|------------|
| 17 | **Shortest Path** | Find and visualize shortest path between any two CIs (Kuzu shortestPath) | Medium |
| 18 | **Cluster Overview** | Bird's-eye view showing CI class distribution as bubbles | Medium |
| 19 | **Relationship Type Filter** | Toggle edge visibility by relationship type | Low |
| 20 | **Hop Depth Control** | UI control to switch between 1/2/3 hops | Low |
| 21 | **Layout Algorithms** | Switch between force-directed 3D, Dagre (hierarchical), Radial | Medium |
| 22 | **Keyboard Shortcuts** | Full keyboard navigation (`/` search, `Esc` close, arrows navigate, `Space` expand) | Low |
| 23 | **WebSocket ETL Updates** | Real-time sync progress streamed to frontend | Medium |
| 24 | **MiniMap** | 2D overview of the 3D graph for orientation | Medium |
| 25 | **CI Timeline** | Change history for selected CI | Medium |
| 26 | **Server-Side Layout** | Pre-compute positions for large neighborhoods using networkx | Medium |
| 27 | **Community Detection** | Louvain algorithm to identify CI clusters/communities | Medium |
| 28 | **Rate Limiting** | Redis sliding window rate limiter per IP | Low |
| 29 | **Context Menu** | Right-click menu: copy ID, expand, hide, find path, details | Low |
| 30 | **Offline Mode** | Last loaded subgraph persisted to IndexedDB | Medium |
| 31 | **Graph Export** | Screenshot/export current graph view as PNG | Low |
| 32 | **Edge Particles** | Animated particles flowing along edges to show data flow | Low |
| 33 | **Level-of-Detail** | Distance-based rendering: full mesh → simplified → point sprite | Medium |
| 34 | **Instanced Rendering** | InstancedMesh for same-class nodes to reduce draw calls | Medium |
| 35 | **Prometheus Metrics** | Backend exposes request latency, cache hit rates, ETL stats | Medium |
| 36 | **Structured Logging** | structlog with request_id correlation | Low |

### Future Features

| # | Feature | Description |
|---|---------|-------------|
| 37 | **Impact Analysis** | Cascade simulation: "What breaks if X goes down?" |
| 38 | **CI Comparison** | Side-by-side diff of two CI attribute sets |
| 39 | **Saved Views** | Bookmark graph configurations + filters |
| 40 | **Team Annotations** | Add notes/labels to graph nodes for team sharing |
| 41 | **API Key Auth** | Multi-user access control |
| 42 | **RBAC** | Role-based access (viewer, editor, admin) |
| 43 | **Compliance Overlay** | Highlight CIs violating compliance rules |
| 44 | **Change Calendar** | Timeline of planned changes overlaid on graph |
| 45 | **AI Natural Language** | Query graph in plain English: "show me all prod databases connected to CRM" |
| 46 | **Graph Diff** | Compare graph topology between two points in time |
| 47 | **Dependency Matrix** | Generate dependency matrix from graph relationships |
| 48 | **SLA Mapping** | Overlay SLA data on service CIs |

---

## Part 2: Required Skills by Domain

### Backend Skills

| Skill | Proficiency | Used For |
|-------|------------|----------|
| **Python 3.12+** | Expert | All backend code |
| **FastAPI** | Expert | REST API, WebSocket, dependency injection, lifespan |
| **Pydantic v2** | Expert | Request/response models, settings, validation |
| **asyncio / async-await** | Expert | Async handlers, connection management, ETL pipeline |
| **Kuzu DB (Cypher)** | Advanced | Graph schema, k-hop queries, shortest path, COPY loading |
| **Redis (redis-py/aioredis)** | Advanced | Caching, rate limiting, pub/sub, ETL state |
| **Meilisearch** | Intermediate | Full-text indexing, search, faceted filtering |
| **ServiceNow Table API** | Advanced | REST pagination, authentication, rate limit handling |
| **Docker** | Intermediate | Dockerfile, multi-stage builds, docker-compose |
| **Graph Theory** | Intermediate | Community detection (Louvain), shortest path, degree analysis |
| **networkx** | Intermediate | Server-side layout computation (spring, kamada-kawai) |
| **APScheduler** | Basic | Cron-like incremental sync scheduling |
| **structlog** | Basic | Structured logging with request correlation |
| **pytest + pytest-asyncio** | Advanced | Unit, integration, API tests |
| **locust** | Basic | Load testing |
| **msgpack** | Basic | Efficient serialization for cache storage |

### Frontend Skills

| Skill | Proficiency | Used For |
|-------|------------|----------|
| **TypeScript 5.x** | Expert | All frontend code, strict mode |
| **React 19** | Expert | Components, hooks, Suspense, concurrent features |
| **Next.js 15** | Advanced | App Router, dynamic imports, SSR shell, routing |
| **Three.js** | Advanced | WebGL scene, custom geometry, materials, lighting |
| **react-force-graph-3d** | Advanced | Force graph rendering, node/edge customization |
| **Zustand** | Advanced | Client state management for graph, UI, ETL |
| **SWR** | Intermediate | API data fetching, caching, deduplication |
| **Tailwind CSS 4** | Advanced | Responsive layout, dark mode, animations |
| **shadcn/ui** | Intermediate | Button, Badge, Tooltip, Skeleton, Toaster components |
| **D3 Force Simulation** | Intermediate | Understanding force config: charge, link, center, collision |
| **WebSocket API** | Intermediate | Real-time ETL updates from backend |
| **IndexedDB (idb-keyval)** | Basic | Offline graph persistence |
| **Vitest** | Intermediate | Unit tests for merge logic, stores |
| **Playwright** | Basic | E2E testing |
| **Chrome DevTools** | Advanced | WebGL profiling, memory analysis, network debugging |
| **WCAG / A11y** | Intermediate | Keyboard navigation, screen reader support |

### DevOps Skills

| Skill | Proficiency | Used For |
|-------|------------|----------|
| **Docker Compose** | Advanced | Multi-service local development |
| **Makefile** | Basic | Dev command shortcuts |
| **Git** | Advanced | Monorepo management |
| **Environment management** | Intermediate | .env files, secrets, config |

### Domain Knowledge

| Area | Depth | Why It Matters |
|------|-------|----------------|
| **ServiceNow CMDB** | Deep | Understand CI classes, relationships, table API, data model |
| **Graph databases** | Intermediate | Property graph model, Cypher query optimization |
| **Graph visualization** | Intermediate | Force-directed layouts, LOD, clustering visualization |
| **Infrastructure topology** | Intermediate | How servers, VMs, apps, services relate to each other |
| **WebGL rendering** | Intermediate | GPU limits, instanced rendering, shader materials |
| **Caching strategies** | Intermediate | Read-through, cache invalidation, TTL management |

---

## Part 3: Technology Dependency Map

```
                    ┌─────────────┐
                    │  User Brain │
                    │  (Domain)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
     │   ServiceNow  │ │  Graph  │ │   WebGL /   │
     │   CMDB Domain │ │  Theory │ │   Three.js  │
     └────────┬──────┘ └──┬──────┘ └──┬──────────┘
              │            │            │
     ┌────────▼──────────▼──────────▼────────────┐
     │           APPLICATION LAYER                │
     │                                            │
     │  Backend:     Frontend:                    │
     │  FastAPI      Next.js 15                   │
     │  Kuzu         react-force-graph-3d         │
     │  Redis        Zustand                      │
     │  Meilisearch  SWR                          │
     │  APScheduler  shadcn/ui                    │
     │               Tailwind                     │
     └────────────────────────────────────────────┘
              │
     ┌────────▼──────────────────────────────────┐
     │           INFRASTRUCTURE                   │
     │  Docker Compose                            │
     │  Redis 7.2, Meilisearch 1.6               │
     │  Python 3.12, Node.js 22                  │
     └───────────────────────────────────────────┘
```
