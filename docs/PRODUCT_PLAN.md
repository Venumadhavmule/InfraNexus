# InfraNexus - Complete Product Plan

> **ServiceNow CMDB Graph Visualizer** | Production-Grade | 1M+ CI Scale | GitNexus-Style
> 
> Version 1.0 | March 2026

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Product Requirements](#4-product-requirements)
5. [System Architecture](#5-system-architecture)
6. [ServiceNow CMDB Deep Dive](#6-servicenow-cmdb-deep-dive)
7. [Technology Stack](#7-technology-stack)
8. [Data Architecture](#8-data-architecture)
9. [API Specification](#9-api-specification)
10. [User Experience Specification](#10-user-experience-specification)
11. [Feature Matrix](#11-feature-matrix)
12. [Performance Budget](#12-performance-budget)
13. [Security Model](#13-security-model)
14. [DevOps & Infrastructure](#14-devops--infrastructure)
15. [Risk Analysis & Mitigations](#15-risk-analysis--mitigations)
16. [Implementation Roadmap](#16-implementation-roadmap)
17. [Success Metrics](#17-success-metrics)
18. [Appendix A: CMDB CI Classes](#appendix-a-cmdb-ci-classes)
19. [Appendix B: Relationship Types](#appendix-b-relationship-types)
20. [Appendix C: Monorepo Structure](#appendix-c-monorepo-structure)

---

## 1. Product Vision

**InfraNexus** transforms the flat, tabular ServiceNow CMDB into a living, explorable 3D graph - revealing the hidden topology of enterprise infrastructure at a glance.

Built for a single developer machine, it ingests millions of CIs via incremental ETL, stores them in an embedded graph database, and renders explorable subgraphs in WebGL - all without a cloud dependency.

### One-line Pitch
> *"See your entire infrastructure as a living galaxy you can fly through, search, and explore - powered by your ServiceNow CMDB."*

### Inspiration
[GitNexus](https://gitnexus.vercel.app) - but for infrastructure instead of code repositories.

---

## 2. Problem Statement

### The CMDB Visibility Gap

ServiceNow CMDB contains the richest data about an organization's infrastructure, but:

| Problem | Impact |
|---------|--------|
| **Flat tables** | CIs shown in lists - no topology awareness |
| **Relationship blindness** | "Depends on" chains invisible without manual clicks |
| **Impact assessment is manual** | "What breaks if this server goes down?" requires expert knowledge |
| **CMDB data rots** | Without visualization, stale/orphan CIs go unnoticed |
| **Onboarding is slow** | New team members can't grasp infrastructure quickly |
| **ServiceNow's native graph viewer** | Limited to ~50 CIs, 2D, no filtering, extremely slow |

### InfraNexus Solves This By

1. **Graph-first rendering**: Every CI is a 3D node, every relationship is an edge
2. **Progressive exploration**: Start from any CI, expand outward via click
3. **Scale**: Handle 1M+ CIs via subgraph loading - never freeze the browser
4. **Search**: Find any CI in < 50ms across a million records
5. **Filtering**: Slice by class, environment, status, relationship type
6. **Offline**: Last explored subgraph available without connectivity

---

## 3. Target Users

### Primary: Infrastructure Engineers & SREs

- **Need**: Understand dependencies before making changes
- **Workflow**: Search for CI → see neighborhood → trace dependencies → assess impact
- **Frequency**: Daily

### Secondary: CMDB Administrators

- **Need**: Audit data quality, find orphan CIs, validate relationships
- **Workflow**: Browse clusters → filter by class → find disconnected nodes
- **Frequency**: Weekly

### Tertiary: IT Leadership & Architects

- **Need**: High-level infrastructure topology overview
- **Workflow**: View cluster map → drill into service domains → screenshot for presentations
- **Frequency**: Monthly

---

## 4. Product Requirements

### 4.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|------------|----------|--------|
| FR-01 | 3D force-directed graph rendering of CMDB CIs | P0 | Planned |
| FR-02 | Search CIs by name, IP, description, class | P0 | Planned |
| FR-03 | Click CI to see details (attributes, relationships) | P0 | Planned |
| FR-04 | Click CI to expand k-hop neighborhood (1/2/3 hops) | P0 | Planned |
| FR-05 | Filter by CI class (toggle visibility) | P0 | Planned |
| FR-06 | Filter by environment (prod/dev/test) | P0 | Planned |
| FR-07 | Filter by relationship type | P1 | Planned |
| FR-08 | ETL: Full sync from ServiceNow | P0 | Planned |
| FR-09 | ETL: Incremental sync (delta only) | P0 | Planned |
| FR-10 | Shortest path between two CIs | P1 | Planned |
| FR-11 | Cluster overview (bird's-eye of all CI classes) | P1 | Planned |
| FR-12 | Dark/light theme | P1 | Planned |
| FR-13 | CI change timeline (history) | P2 | Planned |
| FR-14 | Keyboard shortcuts for power users | P1 | Planned |
| FR-15 | MiniMap (2D overview of 3D graph) | P2 | Planned |
| FR-16 | Real-time ETL progress via WebSocket | P1 | Planned |
| FR-17 | Offline mode (last loaded subgraph) | P2 | Planned |
| FR-18 | Multiple layout algorithms (force, dagre, radial) | P2 | Planned |
| FR-19 | Context menu for CI actions | P2 | Planned |
| FR-20 | Export graph as image (screenshot) | P2 | Planned |

### 4.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|------------|--------|
| NFR-01 | Support 1M+ CIs without degradation | Kuzu handles 1M nodes |
| NFR-02 | k-hop query < 100ms at 1M scale | Kuzu + Redis cache |
| NFR-03 | Search autocomplete < 50ms | Meilisearch |
| NFR-04 | Cold start to first render < 2s | Dynamic imports + streaming |
| NFR-05 | 60fps at 500 nodes | WebGL instanced rendering |
| NFR-06 | 30fps at 2000 nodes | Level-of-detail rendering |
| NFR-07 | Initial bundle < 500KB gzipped | Code splitting + tree shaking |
| NFR-08 | Run on single machine (16GB RAM, 4 cores) | Docker Compose |
| NFR-09 | WCAG 2.1 AA accessibility | Keyboard nav + screen reader |
| NFR-10 | Zero data loss during incremental sync | Transactional ETL |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
                           ┌────────────────────────────┐
                           │      USER BROWSER          │
                           │                            │
                           │  Next.js 15 + React 19     │
                           │  Three.js WebGL Graph      │
                           │  Zustand State              │
                           │  SWR Data Fetching          │
                           │                            │
                           └────────────┬───────────────┘
                                        │
                              REST API + WebSocket
                                        │
                           ┌────────────▼───────────────┐
                           │     FASTAPI BACKEND        │
                           │     Python 3.12+           │
                           │                            │
                           │  ┌────────────────────┐    │
                           │  │    API Layer       │    │
                           │  │  Routers → Services│    │
                           │  └────────┬───────────┘    │
                           │           │                │
                           │  ┌────────▼───────────┐    │
                           │  │  Data Access Layer  │    │
                           │  │  Kuzu + Redis +     │    │
                           │  │  Meilisearch        │    │
                           │  └────────────────────┘    │
                           │                            │
                           │  ┌────────────────────┐    │
                           │  │   ETL Pipeline     │    │
                           │  │  Snow → Transform  │    │
                           │  │  → Load → Index    │    │
                           │  └────────────────────┘    │
                           └────────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
           ┌────────▼──────┐   ┌───────▼──────┐   ┌───────▼──────┐
           │   Kuzu DB     │   │    Redis     │   │ Meilisearch  │
           │  (Embedded)   │   │   (Cache)    │   │  (Search)    │
           │               │   │              │   │              │
           │  CI nodes     │   │  Subgraph    │   │  Full-text   │
           │  REL edges    │   │  cache (LRU) │   │  CI index    │
           │  ~1M nodes    │   │  Rate limits │   │  ~1M docs    │
           │  ~4M edges    │   │  ETL state   │   │  Facets      │
           └───────────────┘   └──────────────┘   └──────────────┘
                                        ▲
                                        │ ETL Sync
                           ┌────────────┴───────────────┐
                           │    SERVICENOW INSTANCE     │
                           │                            │
                           │  /api/now/table/cmdb_ci    │
                           │  /api/now/table/cmdb_rel_ci│
                           │  /api/now/table/cmdb_rel_type│
                           └────────────────────────────┘
```

### 5.2 Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  INITIAL LOAD FLOW:                                                 │
│                                                                      │
│  1. User opens browser → Next.js serves shell (SSR)                 │
│  2. Three.js bundle downloads asynchronously (~700KB)               │
│  3. User searches for a CI → Meilisearch returns matches            │
│  4. User selects CI → Backend queries Kuzu for 2-hop neighborhood   │
│  5. Backend checks Redis cache (hit: return cached, miss: query Kuzu)│
│  6. GraphResponse (nodes + edges) returned to frontend              │
│  7. Zustand store updated → Three.js renders graph                  │
│  8. Camera flies to selected CI                                     │
│                                                                      │
│  PROGRESSIVE EXPLORATION FLOW:                                       │
│                                                                      │
│  1. User double-clicks a node in the graph                          │
│  2. Frontend calls /api/graph/neighborhood/{ci_id}                  │
│  3. Backend returns neighborhood subgraph                           │
│  4. graphMerge.ts merges new nodes into existing graph              │
│  5. New nodes appear at position of clicked node                    │
│  6. Force simulation re-equilibrates (gently, preserving existing)  │
│  7. Expanded node marked "expanded" (won't re-fetch on click)      │
│                                                                      │
│  ETL SYNC FLOW:                                                      │
│                                                                      │
│  1. APScheduler triggers incremental sync every 15 min              │
│  2. Snow client fetches CIs with sys_updated_on >= last_sync        │
│  3. Transformer normalizes records                                  │
│  4. Validator rejects malformed records (logged)                    │
│  5. Kuzu loader upserts CIs + relationships                        │
│  6. Meilisearch indexer upserts search documents                    │
│  7. Redis cache invalidated for affected CIs' neighborhoods        │
│  8. WebSocket broadcasts sync progress + completion                 │
│  9. Frontend ETL store updates → status bar shows "Synced"         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Service Communication

| From | To | Protocol | Purpose |
|------|----|----------|---------|
| Browser | FastAPI | HTTPS REST | API calls |
| Browser | FastAPI | WSS | ETL real-time updates |
| FastAPI | Kuzu | In-process | Graph queries |
| FastAPI | Redis | TCP | Cache R/W, rate limits, ETL state |
| FastAPI | Meilisearch | HTTP | Search queries |
| ETL | ServiceNow | HTTPS | CMDB data fetch |
| ETL | Kuzu | In-process | Data loading |
| ETL | Meilisearch | HTTP | Search indexing |
| ETL | Redis | TCP | Sync state, cache invalidation |

---

## 6. ServiceNow CMDB Deep Dive

### 6.1 CMDB Architecture

ServiceNow's CMDB is a **single-table inheritance** model rooted at `cmdb_ci`:

- **40+ CI classes** organized in an inheritance hierarchy
- **40+ relationship types** stored in `cmdb_rel_ci` table
- **Reference fields** link CIs to users, companies, locations
- **sys_updated_on** timestamp enables incremental sync

### 6.2 CI Hierarchy (Simplified)

```
cmdb_ci (Base - all CIs inherit from this)
│
├── COMPUTE
│   ├── cmdb_ci_server (Physical servers)
│   ├── cmdb_ci_vm_instance (Virtual machines)
│   ├── cmdb_ci_kubernetes_cluster (K8s)
│   └── cmdb_ci_container (Docker/OCI)
│
├── APPLICATIONS
│   ├── cmdb_ci_appl (Applications)
│   ├── cmdb_ci_app_server (App servers: Tomcat, IIS, etc.)
│   └── cmdb_ci_service (Business/technical services)
│
├── DATA
│   ├── cmdb_ci_database (Databases: MSSQL, Oracle, MySQL, Postgres)
│   └── cmdb_ci_storage_device (SAN, NAS, volumes)
│
├── NETWORK
│   ├── cmdb_ci_ip_switch (Switches)
│   ├── cmdb_ci_ip_router (Routers)
│   ├── cmdb_ci_ip_firewall (Firewalls)
│   └── cmdb_ci_lb (Load balancers)
│
└── CLOUD
    ├── cmdb_ci_cloud_service_account (AWS/Azure/GCP accounts)
    └── cmdb_ci_endpoint (HTTP/TCP endpoints)
```

### 6.3 Relationship Semantics

Relationship direction in CMDB follows **parent → child** convention:

```
"Runs on" relationship:
  parent: cmdb_ci_appl (Application)
  child:  cmdb_ci_server (Server)
  Meaning: "Application RUNS ON Server"
  Reverse: "Server RUNS Application"

"Depends on" relationship:
  parent: cmdb_ci_service (Business Service)
  child:  cmdb_ci_database (Database)
  Meaning: "Service DEPENDS ON Database"
  Reverse: "Database USED BY Service"
```

### 6.4 Real-World Graph Characteristics

| Metric | Small Org (10K CIs) | Medium (100K) | Large (500K) | Enterprise (1M+) |
|--------|---------------------|---------------|--------------|-------------------|
| Avg edges/CI | 2-3 | 3-4 | 3-5 | 4-6 |
| Total edges | 20-30K | 300-400K | 1.5-2.5M | 4-6M |
| Super-nodes (degree > 50) | 5-10 | 50-100 | 200-500 | 500-2000 |
| Connected components | 3-5 | 10-20 | 15-30 | 20-50 |
| Graph diameter | 4-6 | 6-8 | 8-10 | 8-12 |
| 2-hop neighborhood size | 10-50 | 20-200 | 50-500 | 50-1000 |
| 3-hop neighborhood size | 50-200 | 200-2000 | 500-5000 | 1000-50000 |

**Critical insight**: 3-hop at enterprise scale can return 50K nodes - MUST enforce max_nodes and degree_threshold.

### 6.5 Common Dependency Chains

```
Business Service (CRM)
  └── Depends on → Application (crm-webapp)
        ├── Runs on → App Server (tomcat-prod-01)
        │     └── Hosted on → VM (vm-prod-042)
        │           └── Hosted on → Hypervisor (esx-host-07)
        │                 └── Hosted on → Physical Server (rack-3u-015)
        │                       └── Contained by → Rack (dc-east-rack-42)
        │                             └── Contained by → Data Center (DC-East)
        │
        ├── Depends on → Database (crm-db-primary)
        │     ├── Cluster of → DB Instance (crm-db-01)
        │     └── Cluster of → DB Instance (crm-db-02)
        │           └── Hosted on → VM → Hypervisor → Physical → Rack → DC
        │
        └── Load balanced by → Load Balancer (f5-prod-01)
              └── Connected by → Switch (core-sw-01)
                    └── Connected by → Router (core-rtr-01)
```

This single business service has a **7-level deep dependency chain** with **~30 CIs**. At 2-hop expansion with the service as center, you'd see ~15 CIs - perfect for visualization.

---

## 7. Technology Stack

### 7.1 Stack Summary

| Layer | Technology | Version | License |
|-------|-----------|---------|---------|
| **Frontend Framework** | Next.js | 15.x | MIT |
| **UI Library** | React | 19.x | MIT |
| **3D Renderer** | Three.js | r170+ | MIT |
| **Graph Library** | react-force-graph-3d | 1.x | MIT |
| **State Management** | Zustand | 5.x | MIT |
| **Data Fetching** | SWR | 2.x | MIT |
| **UI Components** | shadcn/ui | latest | MIT |
| **Styling** | Tailwind CSS | 4.x | MIT |
| **Language** | TypeScript | 5.x | Apache 2.0 |
| **Backend Framework** | FastAPI | 0.115+ | MIT |
| **Graph Database** | Kuzu | 0.8+ | MIT |
| **Cache** | Redis | 7.2 | BSD |
| **Search Engine** | Meilisearch | 1.6+ | MIT |
| **Scheduler** | APScheduler | 3.x | MIT |
| **Containerization** | Docker + Compose | latest | Apache 2.0 |
| **Python** | CPython | 3.12+ | PSF |

### 7.2 Why This Stack (Decision Log)

| Decision | Alternatives Considered | Rationale |
|----------|------------------------|-----------|
| **Kuzu** | Neo4j, DuckDB, NetworkX | Embedded = zero latency, no license, benchmarks 10-100x faster than Neo4j for analytical queries |
| **Meilisearch** | Elasticsearch, Typesense | 10x less memory, instant setup, typo-tolerant, perfect for local-first |
| **FastAPI** | Express.js, Go Gin | Async Python, Pydantic validation, auto-docs, Python ecosystem for data |
| **Next.js 15** | Vite + React, Remix | SSR shell for fast first paint, App Router for clean routing |
| **react-force-graph-3d** | Sigma.js, Cytoscape.js, vis-network | Only production 3D WebGL force-graph library, Three.js integration |
| **Zustand** | Redux Toolkit, Jotai, MobX | Minimal API, subscriptions, React 19 compatible |
| **SWR** | TanStack Query, RTK Query | Simpler API, stale-while-revalidate perfect for CMDB data |
| **shadcn/ui** | Material UI, Ant Design, Chakra | Copy-paste, total control, Tailwind-native, tiny bundle |
| **Redis** | Memcached, in-memory dict | Pub/sub for cache invalidation, sorted sets for rate limiting |
| **APScheduler** | Celery, Cron, Dramatiq | No broker needed, works with single-process Kuzu |
| **Docker Compose** | Kubernetes, bare metal | Local-first, single command startup, matches dev ≈ prod |

---

## 8. Data Architecture

### 8.1 Graph Schema (Kuzu)

```
┌──────────────────────────────────┐
│              CI (Node)            │
│──────────────────────────────────│
│ PK sys_id: STRING (32 hex)      │
│    name: STRING                  │
│    class: STRING                 │
│    class_label: STRING           │
│    operational_status: INT16     │
│    install_status: INT16         │
│    environment: STRING           │
│    ip_address: STRING            │
│    company: STRING               │
│    location: STRING              │
│    managed_by: STRING            │
│    owned_by: STRING              │
│    short_description: STRING     │
│    sys_updated_on: TIMESTAMP     │
│    sys_created_on: TIMESTAMP     │
│    degree: INT32                 │
│    cluster_id: INT32             │
└──────────────┬───────────────────┘
               │
               │ RELATES_TO (Edge)
               │
┌──────────────▼───────────────────┐
│          RELATES_TO (Rel)        │
│──────────────────────────────────│
│    rel_type: STRING              │
│    rel_type_reverse: STRING      │
│    rel_sys_id: STRING            │
│    discovered: BOOLEAN           │
│    sys_updated_on: TIMESTAMP     │
└──────────────────────────────────┘
```

### 8.2 Search Index (Meilisearch)

```json
{
  "uid": "cmdb-cis",
  "primaryKey": "sys_id",
  "document_example": {
    "sys_id": "a1b2c3d4e5f6a7b8a1b2c3d4e5f6a7b8",
    "name": "prod-db-01",
    "class": "cmdb_ci_db_mssql_instance",
    "class_label": "Database",
    "environment": "production",
    "operational_status": 1,
    "ip_address": "10.0.1.42",
    "short_description": "Primary MSSQL production database",
    "company": "Acme Corp",
    "location": "DC-East",
    "sys_updated_on": "2026-03-20T14:30:00Z"
  }
}
```

### 8.3 Cache Schema (Redis)

```
KEYS:
  nb:{ci_id}:{hops}:{filter_hash}    → msgpack(GraphResponse)   TTL: 300s
  ci:{ci_id}                          → JSON(CIDetail)           TTL: 600s
  search:{query_hash}                 → JSON(SearchResponse)     TTL: 60s
  etl:state                           → HASH{last_sync, status}  NO TTL
  rl:{ip_address}                     → ZSET{timestamps}         TTL: 120s
  ws:connections                      → SET{connection_ids}      NO TTL
```

### 8.4 Storage Estimates

| Component | 100K CIs | 500K CIs | 1M CIs |
|-----------|---------|---------|--------|
| **Kuzu DB** | 500 MB | 2.5 GB | 5 GB |
| **Meilisearch** | 200 MB | 1 GB | 2 GB |
| **Redis** (cache) | 200 MB | 500 MB | 750 MB |
| **Redis** (state) | 10 MB | 10 MB | 10 MB |
| **Total disk** | ~1 GB | ~4 GB | ~8 GB |
| **Total RAM** | ~2 GB | ~6 GB | ~11 GB |

---

## 9. API Specification

### 9.1 Endpoint Summary

```
BASE URL: http://localhost:8000

GRAPH ENDPOINTS:
  GET  /api/graph/neighborhood/{ci_id}?hops=2&max_nodes=500&degree_threshold=100
  GET  /api/graph/path/{source_id}/{target_id}
  GET  /api/graph/clusters
  GET  /api/graph/stats

CI ENDPOINTS:
  GET  /api/ci/{ci_id}
  GET  /api/ci/{ci_id}/timeline

SEARCH ENDPOINTS:
  GET  /api/search?q=prod-db&class=Database&env=production&limit=20
  GET  /api/search/suggest?q=prod

ETL ENDPOINTS:
  POST /api/etl/sync                    # Body: { "type": "full" | "incremental" }
  GET  /api/etl/status
  GET  /api/etl/logs?limit=50

HEALTH ENDPOINTS:
  GET  /health                          # Simple liveness
  GET  /ready                           # All dependencies up
  GET  /metrics                         # Prometheus format

WEBSOCKET:
  WS   /ws/etl                          # Real-time ETL updates
```

### 9.2 Key Response Schemas

**GraphResponse** (Neighborhood / Path):
```json
{
  "nodes": [
    {
      "id": "a1b2c3...",
      "name": "prod-db-01",
      "ci_class": "Database",
      "ci_class_raw": "cmdb_ci_db_mssql_instance",
      "environment": "production",
      "operational_status": 1,
      "degree": 12,
      "cluster_id": 3,
      "x": 45.2,
      "y": -12.8,
      "z": 7.1
    }
  ],
  "edges": [
    {
      "source": "a1b2c3...",
      "target": "d4e5f6...",
      "rel_type": "Depends on",
      "rel_type_reverse": "Used by"
    }
  ],
  "center_id": "a1b2c3...",
  "total_nodes_in_neighborhood": 847,
  "truncated": true,
  "query_time_ms": 42.3,
  "cached": false
}
```

**SearchResponse**:
```json
{
  "hits": [
    {
      "sys_id": "a1b2c3...",
      "name": "prod-db-01",
      "class_label": "Database",
      "environment": "production",
      "_highlight": {
        "name": "<em>prod-db</em>-01"
      }
    }
  ],
  "total": 156,
  "facets": {
    "class_label": { "Database": 42, "Server": 78, "Application": 36 },
    "environment": { "production": 100, "development": 40, "test": 16 }
  },
  "query_time_ms": 8.2
}
```

---

## 10. User Experience Specification

### 10.1 Core User Flows

**Flow 1: Search and Explore**
```
1. User lands on InfraNexus → sees empty graph canvas + search bar
2. Types "prod-db" → autocomplete shows 8 matches
3. Clicks "prod-db-01 (Database, production)" 
4. Graph loads 2-hop neighborhood (~30 nodes)
5. Camera flies to prod-db-01 (center, highlighted)
6. Inspector panel shows: name, class, IP, environment, status
7. Relationship list shows: 5 incoming, 7 outgoing connections
```

**Flow 2: Progressive Expansion**
```
1. Starting from Flow 1's graph
2. User double-clicks "crm-webapp" (application node)
3. Backend fetches 2-hop neighborhood of crm-webapp
4. ~25 new nodes merge into existing graph (no duplicates)
5. New nodes animate outward from crm-webapp
6. Total visible: ~50 nodes, force simulation re-equilibrates
7. User can continue clicking to expand further
```

**Flow 3: Impact Analysis**
```
1. User searches for "core-switch-01"
2. Sees it's a super-node (degree: 347)
3. Backend limits to 100 highest-degree neighbors
4. User filters: show only "production" + "Server" + "Database"
5. Graph now shows ~40 critical production dependencies
6. User screenshots this for change advisory board
```

**Flow 4: Path Finding**
```
1. User selects "crm-webapp" then right-clicks "dc-east"
2. Context menu: "Find shortest path"
3. Backend runs shortestPath query in Kuzu
4. Path highlighted in graph: webapp → server → VM → hypervisor → rack → DC
5. Path edges glow with animated particles
```

### 10.2 Entry Points

| Entry Point | Action | Result |
|-------------|--------|--------|
| Search bar | Type CI name/IP | Navigate to CI's neighborhood |
| URL parameter | `?ci=abc123` | Deep link to CI's neighborhood |
| Cluster view | Click cluster bubble | Zoom into cluster's top CIs |
| CI Inspector | Click related CI | Expand that CI's neighborhood |
| Default (no query) | Landing page | Show cluster overview |

### 10.3 Visual Language

| Element | Meaning |
|---------|---------|
| **Node shape** | CI class (sphere=generic, box=server, cylinder=DB, etc.) |
| **Node color** | CI class (consistent palette across themes) |
| **Node size** | Degree (more connections = larger) |
| **Node glow** | Selected or highlighted |
| **Node opacity** | Operational status (operational=bright, retired=dim) |
| **Edge color** | Relationship type |
| **Edge style** | Solid=operational, dashed=hierarchical |
| **Edge width** | Relationship importance (Depends on=thick) |
| **Edge arrows** | Direction (parent → child) |
| **Edge particles** | Active data flow (animated) |

---

## 11. Feature Matrix

### MVP (Phase 1-3, Weeks 1-6)

| Feature | Backend | Frontend | Priority |
|---------|---------|----------|----------|
| ETL: Full sync from ServiceNow | ✅ | - | P0 |
| ETL: Incremental sync | ✅ | - | P0 |
| Graph: k-hop neighborhood | ✅ | ✅ | P0 |
| Search: Full-text + autocomplete | ✅ | ✅ | P0 |
| 3D WebGL graph rendering | - | ✅ | P0 |
| CI Inspector panel | ✅ | ✅ | P0 |
| Node type filtering | - | ✅ | P0 |
| Environment filtering | - | ✅ | P0 |
| Dark/light theme | - | ✅ | P1 |
| Hop depth control | ✅ | ✅ | P1 |
| Keyboard shortcuts | - | ✅ | P1 |
| Redis caching | ✅ | - | P0 |
| Rate limiting | ✅ | - | P1 |
| Health checks | ✅ | - | P0 |
| Docker Compose setup | ✅ | ✅ | P0 |

### Extended (Phase 4-5, Weeks 7-10)

| Feature | Backend | Frontend | Priority |
|---------|---------|----------|----------|
| Shortest path | ✅ | ✅ | P1 |
| Cluster overview | ✅ | ✅ | P1 |
| WebSocket ETL updates | ✅ | ✅ | P1 |
| Relationship type filtering | - | ✅ | P1 |
| MiniMap | - | ✅ | P2 |
| CI Timeline | ✅ | ✅ | P2 |
| Multiple layout algorithms | - | ✅ | P2 |
| Server-side layout | ✅ | - | P2 |
| Community detection | ✅ | - | P2 |
| Context menu | - | ✅ | P2 |
| Offline mode | - | ✅ | P2 |
| Graph export (image) | - | ✅ | P2 |
| Prometheus metrics | ✅ | - | P2 |
| Edge type filtering | - | ✅ | P1 |

### Future (Phase 6+)

| Feature | Description |
|---------|-------------|
| **Impact analysis** | "What breaks if CI X goes down?" cascade simulation |
| **CI comparison** | Side-by-side attribute diff between two CIs |
| **Saved views** | Bookmark specific graph configurations |
| **Team annotations** | Add notes/labels to graph for team sharing |
| **API key auth** | Multi-user access with API keys |
| **RBAC** | Role-based access (viewer, editor, admin) |
| **Webhook integration** | Push notifications on CI status change |
| **Compliance overlay** | Highlight CIs violating compliance rules |
| **Change calendar** | Timeline view of planned changes overlaid on graph |
| **AI assistant** | Natural language queries: "show me all prod databases" |

---

## 12. Performance Budget

### 12.1 Frontend Performance

| Metric | Budget | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.0s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.0s | Lighthouse |
| First meaningful graph render | < 2.0s | Custom timing |
| Time to Interactive (TTI) | < 3.0s | Lighthouse |
| Total bundle (initial) | < 500 KB gz | webpack-bundle-analyzer |
| Three.js chunk (lazy) | < 400 KB gz | webpack-bundle-analyzer |
| Frame rate (500 nodes) | 60 fps | Performance monitor |
| Frame rate (2000 nodes) | 30 fps | Performance monitor |
| Memory (500 nodes) | < 200 MB | Chrome DevTools |
| Memory (2000 nodes) | < 500 MB | Chrome DevTools |

### 12.2 Backend Performance

| Metric | Budget | Measurement |
|--------|--------|-------------|
| Neighborhood query (cached) | < 10 ms | Server-Timing header |
| Neighborhood query (uncached) | < 100 ms | Server-Timing header |
| Search query | < 50 ms | Meilisearch processingTimeMs |
| Suggest query | < 30 ms | Meilisearch processingTimeMs |
| CI detail query | < 50 ms | Server-Timing header |
| Full ETL (1M CIs) | < 30 min | ETL logs |
| Incremental ETL (10K changes) | < 5 min | ETL logs |
| API throughput | 500 req/s | Locust load test |

### 12.3 Infrastructure Budget

| Resource | Budget |
|----------|--------|
| Total RAM | 16 GB (single machine) |
| Total CPU | 4 cores minimum |
| Total disk | 20 GB |
| Docker images | < 2 GB total |

---

## 13. Security Model

### 13.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **ServiceNow credential exposure** | `.env.local` never committed, env vars only |
| **Cypher injection** | All queries parameterized, no string interpolation |
| **API abuse** | Redis sliding window rate limiting (100 req/min/IP) |
| **XSS** | CSP headers, React auto-escaping, no dangerouslySetInnerHTML |
| **CSRF** | SameSite cookies, CORS restricted to localhost |
| **Data exfiltration** | CMDB data stays local, no external API calls from frontend |
| **Meilisearch open access** | Master key configured, API key for search-only |

### 13.2 Security Phases

| Phase | Authentication | Authorization |
|-------|---------------|---------------|
| Phase 1 (local) | None (localhost only) | None |
| Phase 2 (team) | API key in header | Read-only by default |
| Phase 3 (enterprise) | OAuth2/OIDC (ServiceNow SSO) | RBAC (viewer/editor/admin) |

---

## 14. DevOps & Infrastructure

### 14.1 Development Setup

```bash
# One command to start everything
git clone <repo>
cd infranexus
cp .env.example .env.local
# Edit .env.local with ServiceNow credentials
docker compose up -d

# First-time full sync
docker compose exec backend python -m etl.runner --mode full

# App available at:
# Frontend: http://localhost:3000
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
# Redis Insight: http://localhost:8001
```

### 14.2 Docker Services

| Service | Image | Ports | Volumes |
|---------|-------|-------|---------|
| backend | Custom (Python 3.12) | 8000 | ./backend, kuzu_data |
| frontend | Custom (Node 22) | 3000 | - |
| redis | redis:7.2-alpine | 6379 | redis_data |
| meilisearch | getmeili/meilisearch:v1.6 | 7700 | meili_data |
| redis-insight | redislabs/redisinsight | 8001 | - |

### 14.3 Makefile Targets

```makefile
up:          docker compose up -d
down:        docker compose down
logs:        docker compose logs -f
sync-full:   docker compose exec backend python -m etl.runner --mode full
sync-delta:  docker compose exec backend python -m etl.runner --mode incremental
shell:       docker compose exec backend bash
test-back:   docker compose exec backend pytest
test-front:  docker compose exec frontend npm test
reset-db:    docker compose down -v  # Destroys all volumes
```

---

## 15. Risk Analysis & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Kuzu can't handle 1M nodes** | Low | Critical | Benchmark early (Phase 1). Fallback: DuckDB + networkx for graph traversal |
| **Three.js crashes at 2000 nodes** | Medium | High | Enforce max_nodes=500 default. Use InstancedMesh. LOD rendering. |
| **ServiceNow rate limiting blocks ETL** | High | Medium | Exponential backoff, configurable rate (1.4 req/s), incremental sync reduces volume 100x |
| **Super-node explosion** | High | High | degree_threshold filter on all neighborhood queries. Server caps at max_nodes. |
| **Redis memory exhaustion** | Low | Medium | 2GB maxmemory with LRU eviction. Monitor hit rates. |
| **Meilisearch OOM at 1M docs** | Medium | Medium | ~4GB RAM for 1M docs. Allocate sufficient. Fall back to smaller index. |
| **WebGL not supported** | Low | Critical | detect WebGL on load, fallback to 2D canvas (react-force-graph-2d). |
| **Kuzu single-writer bottleneck** | Medium | Medium | Serialize ETL writes, use async lock, separate reader pool. |
| **Stale CMDB data** | Medium | Low | Configurable sync interval (5-60 min). Manual sync button. Cache TTL. |
| **Docker resource contention** | Medium | Medium | Resource limits per container. Total budget: 16GB RAM, 4 cores. |

---

## 16. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal**: All infrastructure running, basic data flow proven.

| Task | Owner | Duration |
|------|-------|----------|
| Monorepo scaffold + Docker Compose | Backend | 1 day |
| FastAPI app skeleton + health checks | Backend | 1 day |
| Kuzu schema bootstrap + connection manager | Backend | 2 days |
| Redis connection + cache service | Backend | 1 day |
| Meilisearch index setup | Backend | 1 day |
| Next.js project + Tailwind + shadcn setup | Frontend | 1 day |
| Page layout + panels + search bar shell | Frontend | 2 days |
| Zustand stores (graph, UI, ETL) | Frontend | 1 day |
| API client (api.ts) | Frontend | 1 day |
| **Milestone: docker compose up → all services green** | | |

### Phase 2: ETL Pipeline (Weeks 2-3)

**Goal**: ServiceNow data flowing into Kuzu + Meilisearch.

| Task | Owner | Duration |
|------|-------|----------|
| ServiceNow REST client (pagination, retry) | Backend | 3 days |
| CI transformer + validator | Backend | 2 days |
| Kuzu bulk loader (COPY) | Backend | 2 days |
| Meilisearch batch indexer | Backend | 1 day |
| State manager (Redis sync state) | Backend | 1 day |
| Full sync CLI runner | Backend | 1 day |
| Incremental sync CLI runner | Backend | 2 days |
| APScheduler auto-sync | Backend | 1 day |
| **Milestone: 1M CIs synced, queryable in Kuzu + searchable in Meili** | | |

### Phase 3: Core API + Graph (Weeks 3-5)

**Goal**: User can search, click, and explore graph.

| Task | Owner | Duration |
|------|-------|----------|
| Neighborhood API endpoint | Backend | 2 days |
| CI detail endpoint | Backend | 1 day |
| Search endpoint (Meilisearch) | Backend | 1 day |
| Suggest/autocomplete endpoint | Backend | 1 day |
| Redis caching layer | Backend | 2 days |
| ForceGraph3D integration (dynamic import) | Frontend | 3 days |
| Custom node rendering (NodeObject) | Frontend | 2 days |
| Custom edge rendering (EdgeObject) | Frontend | 1 day |
| Search bar + autocomplete connected | Frontend | 2 days |
| Node click → select (inspector) | Frontend | 1 day |
| Node double-click → expand | Frontend | 2 days |
| Graph merge logic (graphMerge.ts) | Frontend | 2 days |
| Camera fly-to animation | Frontend | 1 day |
| **Milestone: Full search → explore workflow functional** | | |

### Phase 4: Filters & Controls (Weeks 5-6)

**Goal**: User can filter, control, and customize the graph.

| Task | Owner | Duration |
|------|-------|----------|
| Node type filter (CI class toggles) | Frontend | 1 day |
| Edge type filter | Frontend | 1 day |
| Environment filter | Frontend | 1 day |
| Hop depth control (1/2/3) | Frontend | 1 day |
| Layout selector | Frontend | 2 days |
| Keyboard shortcuts | Frontend | 1 day |
| Dark/light theme | Frontend | 1 day |
| Rate limiting middleware | Backend | 1 day |
| Request ID middleware | Backend | 0.5 day |
| Server-Timing middleware | Backend | 0.5 day |
| **Milestone: Full-featured graph exploration** | | |

### Phase 5: Advanced Features (Weeks 7-8)

| Task | Owner | Duration |
|------|-------|----------|
| Shortest path endpoint | Backend | 2 days |
| Cluster overview endpoint | Backend | 2 days |
| Community detection (Louvain) | Backend | 2 days |
| Server-side layout | Backend | 2 days |
| Shortest path visualization | Frontend | 2 days |
| Cluster view (bubble overview) | Frontend | 2 days |
| MiniMap | Frontend | 2 days |
| WebSocket ETL updates | Both | 2 days |
| CI Timeline panel | Both | 2 days |
| Context menu | Frontend | 1 day |
| **Milestone: Production-ready feature set** | | |

### Phase 6: Hardening (Weeks 9-10)

| Task | Owner | Duration |
|------|-------|----------|
| Structured logging (structlog) | Backend | 1 day |
| Prometheus metrics | Backend | 1 day |
| Load testing (locust) | Backend | 2 days |
| Offline mode (IndexedDB) | Frontend | 2 days |
| Accessibility audit + fixes | Frontend | 2 days |
| Performance audit (Lighthouse) | Frontend | 1 day |
| Bundle optimization | Frontend | 1 day |
| Documentation | Both | 2 days |
| **Milestone: Production-grade, documented, tested** | | |

---

## 17. Success Metrics

### Launch Criteria (Must pass all)

| Metric | Threshold |
|--------|-----------|
| ETL: Full sync 100K CIs completes | < 10 minutes |
| ETL: Incremental sync 1K changes | < 1 minute |
| API: Neighborhood query p95 (cached) | < 10 ms |
| API: Neighborhood query p95 (uncached) | < 100 ms |
| API: Search p95 | < 50 ms |
| Frontend: LCP | < 2.0 seconds |
| Frontend: FPS at 500 nodes | ≥ 60 fps |
| Frontend: FPS at 2000 nodes | ≥ 30 fps |
| Frontend: Initial bundle | < 500 KB gzipped |
| All health checks passing | /health + /ready |
| Docker compose up → usable | < 2 minutes |

### Growth Metrics (Track monthly)

| Metric | Target |
|--------|--------|
| CIs synced | Track growth over time |
| Unique searches per day | Confirms usage |
| Average graph session length | > 5 minutes |
| Popular CI classes explored | Understand usage patterns |
| Stale CI ratio (never viewed) | Should decrease |

---

## Appendix A: CMDB CI Classes

Full hierarchy of 40+ CI classes supported by InfraNexus:

| Category | Class Name | Label | Node Shape | Color |
|----------|-----------|-------|------------|-------|
| Compute | cmdb_ci_server | Server | Box | #4F46E5 |
| Compute | cmdb_ci_win_server | Windows Server | Box | #4F46E5 |
| Compute | cmdb_ci_linux_server | Linux Server | Box | #4F46E5 |
| Compute | cmdb_ci_unix_server | Unix Server | Box | #4F46E5 |
| Compute | cmdb_ci_vm_instance | Virtual Machine | Sphere | #7C3AED |
| Compute | cmdb_ci_vm_vmware | VMware VM | Sphere | #7C3AED |
| Compute | cmdb_ci_computer | Computer | Box | #4F46E5 |
| App | cmdb_ci_appl | Application | Octahedron | #D97706 |
| App | cmdb_ci_business_app | Business App | Octahedron | #D97706 |
| App | cmdb_ci_app_server | App Server | Octahedron | #D97706 |
| App | cmdb_ci_app_server_tomcat | Tomcat | Octahedron | #D97706 |
| App | cmdb_ci_app_server_iis | IIS | Octahedron | #D97706 |
| Service | cmdb_ci_service | Service | Torus | #DC2626 |
| Service | cmdb_ci_service_auto | Discovered Service | Torus | #DC2626 |
| Data | cmdb_ci_database | Database | Cylinder | #059669 |
| Data | cmdb_ci_db_mssql_instance | MSSQL | Cylinder | #059669 |
| Data | cmdb_ci_db_ora_instance | Oracle DB | Cylinder | #059669 |
| Data | cmdb_ci_db_mysql_instance | MySQL | Cylinder | #059669 |
| Data | cmdb_ci_db_postgresql_instance | PostgreSQL | Cylinder | #059669 |
| Data | cmdb_ci_storage_device | Storage | Cylinder | #9333EA |
| Network | cmdb_ci_ip_switch | Switch | Octahedron | #65A30D |
| Network | cmdb_ci_ip_router | Router | Octahedron | #65A30D |
| Network | cmdb_ci_ip_firewall | Firewall | Box | #E11D48 |
| Network | cmdb_ci_lb | Load Balancer | Sphere | #0891B2 |
| Network | cmdb_ci_network_adapter | Network Adapter | Sphere | #65A30D |
| K8s | cmdb_ci_kubernetes_cluster | K8s Cluster | Octahedron | #326CE5 |
| K8s | cmdb_ci_kubernetes_node | K8s Node | Box | #326CE5 |
| K8s | cmdb_ci_kubernetes_pod | K8s Pod | Sphere | #326CE5 |
| K8s | cmdb_ci_container | Container | Box | #2496ED |
| Cloud | cmdb_ci_cloud_service_account | Cloud Account | Sphere | #0EA5E9 |
| Cloud | cmdb_ci_cloud_aws | AWS | Sphere | #FF9900 |
| Cloud | cmdb_ci_cloud_azure | Azure | Sphere | #0078D4 |
| Cloud | cmdb_ci_cloud_gcp | GCP | Sphere | #4285F4 |
| Infra | cmdb_ci_cluster | Cluster | Torus | #F59E0B |
| Infra | cmdb_ci_endpoint | Endpoint | Sphere | #6366F1 |
| Infra | cmdb_ci_dns_entry | DNS Entry | Sphere | #6B7280 |

## Appendix B: Relationship Types

| Forward Name | Reverse Name | Typical Usage | Edge Style | Edge Color |
|-------------|--------------|---------------|------------|------------|
| Runs on | Runs | App → Server | Solid | #818CF8 |
| Hosted on | Hosts | VM → Hypervisor | Solid | #A78BFA |
| Depends on | Used by | Service → DB | Solid thick | #F87171 |
| Contains | Contained by | Rack → Server | Dashed | #60A5FA |
| Members of | Member of | Cluster → Node | Dashed | #34D399 |
| Connected by | Connects | Switch → Router | Solid | #FBBF24 |
| Cluster of | Cluster | Cluster → Node | Dashed | #34D399 |
| Provided by | Provides | Service → Team | Solid | #F472B6 |
| Sends data to | Receives data from | App → DB | Solid | #F472B6 |
| Caches | Cached by | Cache → Origin | Dashed | #22D3EE |
| Load balanced by | Load balances | App → LB | Solid | #22D3EE |
| Backed up by | Backs up | Server → Backup | Dashed | #9CA3AF |
| Monitored by | Monitors | Server → Monitor | Dashed | #9CA3AF |
| Replaces | Replaced by | New → Old | Dotted | #6B7280 |
| DR for | Has DR | DR → Prod | Dashed | #F87171 |
| Manages | Managed by | Tool → Server | Solid | #818CF8 |
| Uses | Used by | App → Middleware | Solid | #818CF8 |
| Upstream | Downstream | Network flow | Solid | #FBBF24 |

## Appendix C: Monorepo Structure

```
infranexus/
├── docker-compose.yml              # Dev environment
├── docker-compose.prod.yml         # Production overrides
├── .env.example                    # Template for environment vars
├── .env.local                      # Local secrets (gitignored)
├── Makefile                        # Dev commands
├── README.md                       # Project overview
│
├── docs/                           # Architecture documentation
│   ├── BACKEND_PLAN.md
│   ├── FRONTEND_PLAN.md
│   ├── PRODUCT_PLAN.md
│   └── FEATURES.md
│
├── backend/                        # FastAPI Python backend
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── dependencies.py
│   │   ├── core/
│   │   │   ├── kuzu_manager.py
│   │   │   ├── redis_manager.py
│   │   │   ├── meili_manager.py
│   │   │   └── exceptions.py
│   │   ├── models/
│   │   │   ├── ci.py
│   │   │   ├── graph.py
│   │   │   ├── search.py
│   │   │   └── etl.py
│   │   ├── routers/
│   │   │   ├── graph.py
│   │   │   ├── ci.py
│   │   │   ├── search.py
│   │   │   ├── etl.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   ├── graph_service.py
│   │   │   ├── ci_service.py
│   │   │   ├── search_service.py
│   │   │   ├── cache_service.py
│   │   │   └── layout_service.py
│   │   └── middleware/
│   │       ├── rate_limit.py
│   │       ├── request_id.py
│   │       └── timing.py
│   └── etl/
│       ├── runner.py
│       ├── snow_client.py
│       ├── kuzu_loader.py
│       ├── meili_indexer.py
│       ├── transformer.py
│       ├── validators.py
│       ├── state_manager.py
│       └── scheduler.py
│
└── frontend/                       # Next.js TypeScript frontend
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx
        │   └── graph/
        │       └── page.tsx
        ├── components/
        │   ├── graph/
        │   ├── panels/
        │   ├── search/
        │   ├── controls/
        │   └── ui/
        ├── hooks/
        ├── store/
        ├── lib/
        └── types/
```

---

*This is the single source of truth for the InfraNexus product. Backend and frontend plans reference this document for cross-cutting concerns.*
