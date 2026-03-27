# InfraNexus - Backend Architecture Plan

> **Version**: 1.0 | **Author**: InfraNexus Architecture Team | **Stack**: FastAPI + Kuzu + Redis + Meilisearch

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [ServiceNow CMDB Data Model](#3-servicenow-cmdb-data-model)
4. [Graph Database Layer - Kuzu](#4-graph-database-layer--kuzu)
5. [ETL Pipeline - ServiceNow Ingestion](#5-etl-pipeline--servicenow-ingestion)
6. [API Layer - FastAPI](#6-api-layer--fastapi)
7. [Search Engine - Meilisearch](#7-search-engine--meilisearch)
8. [Caching Layer - Redis](#8-caching-layer--redis)
9. [WebSocket Real-Time Layer](#9-websocket-real-time-layer)
10. [Performance Engineering](#10-performance-engineering)
11. [Security Architecture](#11-security-architecture)
12. [Observability & Monitoring](#12-observability--monitoring)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [Deployment & Infrastructure](#14-deployment--infrastructure)
15. [Testing Strategy](#15-testing-strategy)
16. [Implementation Phases](#16-implementation-phases)

---

## 1. Executive Summary

The InfraNexus backend is a **Python FastAPI service** that serves as the data engine for a CMDB graph visualizer. It must:

- **Ingest** 1,000,000+ CIs from ServiceNow via incremental ETL
- **Store** CI/relationship data in Kuzu (embedded graph DB) for sub-100ms k-hop neighborhood queries
- **Index** full-text search in Meilisearch for instant CI lookup
- **Cache** hot subgraphs in Redis for < 50ms repeat queries
- **Serve** graph neighborhoods, shortest paths, and cluster data via REST + WebSocket APIs
- **Run** entirely on a single developer machine (local-first, Docker Compose)

### Non-Negotiable Performance Targets

| Metric | Target | Strategy |
|--------|--------|----------|
| k-hop neighborhood query | < 100ms at 1M nodes | Kuzu Cypher + Redis cache |
| Search autocomplete | < 50ms | Meilisearch prefix search |
| Cold start → first render | < 2 seconds | Pre-warmed cache + streaming response |
| Incremental sync latency | < 5 min for 10K changes | Delta sync via `sys_updated_on` |
| API throughput | 500 req/s sustained | Async FastAPI + connection pooling |

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                         │
│         Calls backend directly (no Next.js API proxy)        │
└───────────────────────┬──────────────────────────────────────┘
                        │ REST + WebSocket
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌───────────────┐  │
│  │ Routers │→ │Services │→ │  Core   │→ │  Middleware    │  │
│  │ graph   │  │ graph   │  │ kuzu    │  │ rate_limit    │  │
│  │ ci      │  │ ci      │  │ redis   │  │ request_id    │  │
│  │ search  │  │ search  │  │ meili   │  │ timing        │  │
│  │ etl     │  │ cache   │  │         │  │ cors          │  │
│  │ health  │  │ layout  │  │         │  │               │  │
│  └─────────┘  └─────────┘  └─────────┘  └───────────────┘  │
└──────┬────────────┬────────────┬─────────────────────────────┘
       │            │            │
       ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│  Kuzu DB │  │  Redis   │  │ Meilisearch  │
│ (Graph)  │  │ (Cache)  │  │ (Search)     │
│ 1M nodes │  │ 2GB LRU  │  │ 1M docs      │
└──────────┘  └──────────┘  └──────────────┘
       ▲
       │ Batch COPY
┌──────────────────────────┐
│      ETL PIPELINE        │
│  snow_client → transform │
│  → validate → kuzu_load  │
│  → meili_index           │
│  → cache_invalidate      │
└──────────┬───────────────┘
           │ REST API
           ▼
┌──────────────────────────┐
│   SERVICENOW INSTANCE    │
│   /api/now/table/cmdb_ci │
│   /api/now/table/cmdb_rel│
└──────────────────────────┘
```

### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **Kuzu over Neo4j** | Embedded = no network hop, no license cost. Kuzu benchmarks show 10-100x faster for analytical graph queries than Neo4j on single machine. |
| **No Next.js API proxy** | Adds unnecessary latency + complexity. Frontend calls FastAPI directly via CORS. Next.js route handlers removed. |
| **Redis for caching, not Kuzu result cache** | Redis allows TTL, LRU eviction, shared across processes, and pub/sub for cache invalidation. |
| **Meilisearch over Elasticsearch** | 10x less memory, instant setup, typo-tolerant out of box. Perfect for local-first. |
| **APScheduler over Celery** | Single-process, no broker needed. Kuzu is embedded (single-writer), so distributed workers are impossible anyway. |
| **No Alembic** | Primary store is Kuzu (schema-on-write). Alembic adds unnecessary complexity. Schema versioning handled via Kuzu DDL scripts. |

---

## 3. ServiceNow CMDB Data Model

### 3.1 CI Class Hierarchy (40+ Classes)

ServiceNow CMDB uses a **single-table inheritance** model rooted at `cmdb_ci`. Every CI has a `sys_class_name` field that determines its type and which additional attributes apply.

```
cmdb_ci (base)
├── cmdb_ci_computer
│   ├── cmdb_ci_server
│   │   ├── cmdb_ci_win_server
│   │   ├── cmdb_ci_linux_server
│   │   └── cmdb_ci_unix_server
│   └── cmdb_ci_pc_hardware
├── cmdb_ci_vm_instance
│   ├── cmdb_ci_vm_vmware
│   └── cmdb_ci_vm_azure
├── cmdb_ci_app_server
│   ├── cmdb_ci_app_server_tomcat
│   ├── cmdb_ci_app_server_iis
│   └── cmdb_ci_app_server_websphere
├── cmdb_ci_appl (Applications)
│   └── cmdb_ci_business_app
├── cmdb_ci_service
│   ├── cmdb_ci_service_auto (discovered)
│   └── cmdb_ci_service_technical
├── cmdb_ci_database
│   ├── cmdb_ci_db_mssql_instance
│   ├── cmdb_ci_db_ora_instance
│   ├── cmdb_ci_db_mysql_instance
│   └── cmdb_ci_db_postgresql_instance
├── cmdb_ci_cluster
│   ├── cmdb_ci_cluster_node
│   └── cmdb_ci_vcenter_cluster
├── cmdb_ci_kubernetes_cluster
│   ├── cmdb_ci_kubernetes_node
│   ├── cmdb_ci_kubernetes_pod
│   └── cmdb_ci_kubernetes_namespace
├── cmdb_ci_container
├── cmdb_ci_storage_device
│   ├── cmdb_ci_storage_volume
│   └── cmdb_ci_san_fabric
├── cmdb_ci_netgear (Network Devices)
│   ├── cmdb_ci_ip_switch
│   ├── cmdb_ci_ip_router
│   ├── cmdb_ci_ip_firewall
│   └── cmdb_ci_lb (Load Balancers)
├── cmdb_ci_network_adapter
├── cmdb_ci_ip_address
├── cmdb_ci_endpoint
│   ├── cmdb_ci_endpoint_http
│   └── cmdb_ci_endpoint_tcp
├── cmdb_ci_cloud_service_account
│   ├── cmdb_ci_cloud_aws
│   ├── cmdb_ci_cloud_azure
│   └── cmdb_ci_cloud_gcp
└── cmdb_ci_dns_entry
```

### 3.2 Universal CI Attributes (All Classes Inherit)

| Attribute | Type | Description |
|-----------|------|-------------|
| `sys_id` | string (32 hex) | Globally unique identifier |
| `name` | string | Display name |
| `sys_class_name` | string | Concrete class (determines type) |
| `operational_status` | integer | 1=Operational, 2=Non-Operational, 3=Repair, 4=Retired |
| `install_status` | integer | 1=Installed, 2=On Order, 3=In Stock, 7=Retired, 8=Absent |
| `environment` | string | production, development, test, staging, QA, DR |
| `sys_updated_on` | datetime | Last modification timestamp (critical for incremental sync) |
| `sys_created_on` | datetime | Creation timestamp |
| `company` | reference | Owning company (sys_id → core_company) |
| `department` | reference | Department (sys_id → cmn_department) |
| `location` | reference | Physical location (sys_id → cmn_location) |
| `managed_by` | reference | Technical manager (sys_id → sys_user) |
| `owned_by` | reference | Business owner (sys_id → sys_user) |
| `ip_address` | string | Primary IP |
| `dns_domain` | string | DNS domain |
| `asset_tag` | string | Asset tag identifier |
| `serial_number` | string | Serial number |
| `short_description` | string | Brief description |
| `comments` | string | Additional notes |

### 3.3 Relationship Types (cmdb_rel_ci / cmdb_rel_type)

The `cmdb_rel_ci` table stores every edge in the graph:

```
cmdb_rel_ci:
  sys_id          → unique edge ID
  parent          → sys_id of parent CI
  child           → sys_id of child CI  
  type            → sys_id → cmdb_rel_type (relationship definition)
```

**Standard Relationship Types (40+ in ServiceNow):**

| Forward Name | Reverse Name | Typical Usage |
|-------------|--------------|---------------|
| Runs on | Runs | App → Server |
| Hosted on | Hosts | VM → Hypervisor |
| Depends on | Used by | Service → Database |
| Contains | Contained by | Rack → Server |
| Members of | Member of | Cluster → Nodes |
| Connected by | Connects | Switch → Router |
| Cluster of | Cluster | Cluster → Components |
| Provided by | Provides | Service → Team |
| Sends data to | Receives data from | App → Database |
| Caches | Cached by | Cache → Origin |
| Load balanced by | Load balances | App → LB |
| Backed up by | Backs up | Server → Backup |
| Monitored by | Monitors | Server → Monitoring Tool |
| Replaces | Replaced by | New Server → Old Server |
| DR for | has DR | DR-app → Prod-app |
| Manages | Managed by | Tool → Server |
| Uses | Used by | App → Middleware |
| Communicates with | Communicates with | Bidirectional |
| Instantiates | Instantiated by | Template → Instance |
| Upstream | Downstream | Network flow direction |
| Gets patches from | Sends patches to | Server → Patch Server |

### 3.4 Graph Topology Characteristics

Based on production CMDB analysis at enterprise scale (500K-2M CIs):

| Metric | Value | Implication |
|--------|-------|-------------|
| Average degree | 3-4 edges/CI | Sparse graph - good for Kuzu |
| Degree distribution | Power-law (heavy tail) | Super-nodes exist |
| Super-node degree | 50-2000 edges | Business services, core switches, LBs |
| Graph diameter | 6-10 hops | Small-world property |
| Clustering coefficient | 0.3-0.5 | Natural community structure |
| Connected components | 5-20 major | Isolated test/dev environments |
| Typical subgraph (2-hop) | 20-200 nodes | Perfect for visualization |
| Typical subgraph (3-hop) | 200-5000 nodes | Needs server-side filtering |

**Common Graph Patterns:**

1. **Business Service Star**: A service CI as hub with 50-300 spokes (apps, DBs, servers)
2. **Infrastructure Chain**: App → App Server → VM → Hypervisor → Physical → Rack → DC
3. **Database Cluster Fan**: DB cluster → 3-5 instances → Storage volumes
4. **Kubernetes Hierarchy**: Cluster → Namespace → Deployment → Pod → Container
5. **Network Mesh**: Core switch ↔ Distribution ↔ Access ↔ Servers (high connectivity)

---

## 4. Graph Database Layer - Kuzu

### 4.1 Why Kuzu

Kuzu is an **embedded columnar graph database** (like DuckDB for graphs):

- **Zero network latency**: Runs in-process with the Python backend
- **Columnar storage**: Optimized for analytical scan queries
- **Cypher support**: Industry-standard graph query language
- **Bulk loading**: COPY command for CSV import at 1M+ records/sec
- **Benchmarks**: 10-100x faster than Neo4j for multi-hop analytical queries
- **Single file**: Easy backup, no server management
- **Free & open-source**: No license costs

### 4.2 Schema Definition

```cypher
-- Node tables
CREATE NODE TABLE CI (
    sys_id STRING,
    name STRING,
    class STRING,              -- sys_class_name (short form)
    class_label STRING,        -- Human-readable class label
    operational_status INT16,
    install_status INT16,
    environment STRING,
    ip_address STRING,
    company STRING,
    location STRING,
    managed_by STRING,
    owned_by STRING,
    short_description STRING,
    sys_updated_on TIMESTAMP,
    sys_created_on TIMESTAMP,
    -- Computed/derived
    degree INT32 DEFAULT 0,    -- Pre-computed edge count
    cluster_id INT32 DEFAULT -1, -- Pre-computed community ID
    PRIMARY KEY (sys_id)
);

-- Relationship table
CREATE REL TABLE RELATES_TO (
    FROM CI TO CI,
    rel_type STRING,           -- Forward relationship name
    rel_type_reverse STRING,   -- Reverse relationship name  
    rel_sys_id STRING,         -- Original cmdb_rel_ci.sys_id
    discovered BOOLEAN DEFAULT FALSE,
    sys_updated_on TIMESTAMP
);
```

### 4.3 Critical Queries

**k-hop Neighborhood (THE most important query):**

```cypher
-- 2-hop neighborhood from a given CI
MATCH (center:CI {sys_id: $ci_id})-[r:RELATES_TO*1..2]-(neighbor:CI)
RETURN center, r, neighbor
LIMIT $max_nodes;
```

**Optimized neighborhood with degree filtering (avoid super-node explosion):**

```cypher
-- 2-hop but skip super-nodes with degree > threshold
MATCH (center:CI {sys_id: $ci_id})-[r1:RELATES_TO]-(hop1:CI)
WHERE hop1.degree < $degree_threshold
OPTIONAL MATCH (hop1)-[r2:RELATES_TO]-(hop2:CI)
WHERE hop2.degree < $degree_threshold
RETURN center, hop1, hop2, r1, r2;
```

**Shortest path between two CIs:**

```cypher
MATCH p = shortestPath(
    (a:CI {sys_id: $source_id})-[*..10]-(b:CI {sys_id: $target_id})
)
RETURN p;
```

**Cluster summary (top-level view):**

```cypher
MATCH (c:CI)
RETURN c.class, c.environment, COUNT(*) AS count, 
       AVG(c.degree) AS avg_degree
ORDER BY count DESC;
```

### 4.4 Connection Management

Kuzu is embedded (single process, single writer). The connection strategy:

```python
class KuzuManager:
    """Manages Kuzu database lifecycle.
    
    CRITICAL: Kuzu allows ONE writer connection and MANY reader connections.
    - ETL writes use the writer connection (serialized via asyncio.Lock)
    - API reads use a pool of reader connections
    """
    
    def __init__(self, db_path: str):
        self.db = kuzu.Database(db_path)
        self._write_lock = asyncio.Lock()
        self._read_pool: list[kuzu.Connection] = []
        self._pool_size = 4  # Match CPU cores
    
    async def read_query(self, cypher: str, params: dict) -> list:
        conn = self._acquire_reader()
        try:
            result = conn.execute(cypher, params)
            return result.get_as_df().to_dict('records')
        finally:
            self._release_reader(conn)
    
    async def write_query(self, cypher: str, params: dict):
        async with self._write_lock:
            conn = kuzu.Connection(self.db)
            conn.execute(cypher, params)
```

### 4.5 Bulk Loading Strategy

```python
# ETL: Transform ServiceNow records → CSV → Kuzu COPY
async def bulk_load_cis(csv_path: str):
    """Load CIs via Kuzu COPY command (fastest path)."""
    conn.execute(f"COPY CI FROM '{csv_path}' (HEADER=true, DELIM=',')")

async def bulk_load_relationships(csv_path: str):
    """Load relationships via Kuzu COPY command."""
    conn.execute(f"COPY RELATES_TO FROM '{csv_path}' (HEADER=true, DELIM=',')")
```

**Performance expectations:**
- COPY 1M CI nodes: ~30-60 seconds
- COPY 3-4M relationships: ~60-120 seconds
- k-hop query at 1M scale: ~5-50ms (with index on sys_id)

---

## 5. ETL Pipeline - ServiceNow Ingestion

### 5.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│                ETL PIPELINE                          │
│                                                      │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────┐ │
│  │ Snow     │──→│ Transformer │──→│ Validator    │ │
│  │ Client   │   │             │   │              │ │
│  └──────────┘   └─────────────┘   └──────┬───────┘ │
│                                          │          │
│                    ┌─────────────────────┤          │
│                    │                     │          │
│                    ▼                     ▼          │
│           ┌──────────────┐    ┌──────────────────┐ │
│           │ Kuzu Loader  │    │ Meili Indexer    │ │
│           │ (batch COPY) │    │ (batch upsert)  │ │
│           └──────────────┘    └──────────────────┘ │
│                    │                               │
│                    ▼                               │
│           ┌──────────────┐                         │
│           │State Manager │ ← Redis (sync state)   │
│           └──────────────┘                         │
└─────────────────────────────────────────────────────┘
```

### 5.2 ServiceNow REST Client

```python
class SnowClient:
    """ServiceNow Table API client with pagination, retry, and rate limiting."""
    
    BASE_TABLES = {
        'cis': 'cmdb_ci',
        'relationships': 'cmdb_rel_ci',
        'rel_types': 'cmdb_rel_type',
    }
    
    # ServiceNow rate limits: ~30 req/min for table API
    # We use 1.4 req/s with exponential backoff
    RATE_LIMIT = 1.4  # requests per second
    PAGE_SIZE = 1000   # max records per request
    
    async def fetch_cis_incremental(self, since: datetime) -> AsyncIterator[dict]:
        """Fetch CIs updated since given timestamp."""
        query = f"sys_updated_on>={since.strftime('%Y-%m-%d %H:%M:%S')}"
        async for page in self._paginate('cmdb_ci', query):
            for record in page:
                yield record
    
    async def fetch_all_cis(self, ci_class: str = None) -> AsyncIterator[dict]:
        """Full fetch with optional class filter."""
        query = f"sys_class_name={ci_class}" if ci_class else ""
        async for page in self._paginate('cmdb_ci', query):
            for record in page:
                yield record
    
    async def fetch_relationships(self, since: datetime = None) -> AsyncIterator[dict]:
        """Fetch relationship records."""
        query = f"sys_updated_on>={since.strftime(...)}" if since else ""
        async for page in self._paginate('cmdb_rel_ci', query):
            for record in page:
                yield record
    
    async def _paginate(self, table: str, query: str) -> AsyncIterator[list]:
        """Paginate through ServiceNow table API responses."""
        offset = 0
        while True:
            params = {
                'sysparm_query': query,
                'sysparm_limit': self.PAGE_SIZE,
                'sysparm_offset': offset,
                'sysparm_fields': self._fields_for(table),
            }
            response = await self._request(f'/api/now/table/{table}', params)
            records = response['result']
            if not records:
                break
            yield records
            offset += self.PAGE_SIZE
            await asyncio.sleep(1 / self.RATE_LIMIT)
```

### 5.3 Incremental Sync Strategy

```
Phase 1: FULL SYNC (first run only)
  1. Fetch all cmdb_rel_type records → build type lookup map
  2. Fetch all cmdb_ci records (paginated, ~1000/req)
     → Transform → Validate → Write CSVs
  3. Fetch all cmdb_rel_ci records (paginated)
     → Transform (resolve type names) → Validate → Write CSVs
  4. Kuzu COPY CI CSV → Kuzu COPY REL CSV
  5. Meilisearch batch import CI documents
  6. Redis: store sync state { last_sync, total_cis, total_rels }
  7. Compute degree counts + community detection → update CI nodes

Phase 2: INCREMENTAL SYNC (every 5-15 min via APScheduler)
  1. Read last_sync from Redis
  2. Fetch CIs where sys_updated_on >= last_sync
  3. For each changed CI:
     a. Upsert into Kuzu (MERGE)
     b. Upsert into Meilisearch
     c. Invalidate Redis cache for CI's neighborhood
  4. Fetch relationships where sys_updated_on >= last_sync
  5. For each changed relationship:
     a. Upsert into Kuzu
     b. Invalidate Redis cache for both parent and child neighborhoods
  6. Update last_sync timestamp
  7. Broadcast WebSocket event: { type: 'sync_complete', stats: {...} }
```

### 5.4 Data Transformation

```python
class CITransformer:
    """Transform raw ServiceNow records into canonical format."""
    
    # Map ServiceNow class names to simplified categories
    CLASS_CATEGORIES = {
        'cmdb_ci_server': 'Server',
        'cmdb_ci_win_server': 'Server',
        'cmdb_ci_linux_server': 'Server',
        'cmdb_ci_vm_instance': 'Virtual Machine',
        'cmdb_ci_database': 'Database',
        'cmdb_ci_db_mssql_instance': 'Database',
        'cmdb_ci_appl': 'Application',
        'cmdb_ci_service': 'Service',
        'cmdb_ci_kubernetes_cluster': 'Kubernetes',
        'cmdb_ci_lb': 'Load Balancer',
        'cmdb_ci_ip_switch': 'Network',
        'cmdb_ci_ip_router': 'Network',
        'cmdb_ci_ip_firewall': 'Firewall',
        'cmdb_ci_storage_device': 'Storage',
        'cmdb_ci_cluster': 'Cluster',
        'cmdb_ci_container': 'Container',
        # ... 30+ more mappings
    }
    
    def transform_ci(self, raw: dict) -> dict:
        """Transform raw Snow record to canonical CI."""
        return {
            'sys_id': raw['sys_id'],
            'name': raw.get('name', 'Unknown'),
            'class': raw.get('sys_class_name', 'cmdb_ci'),
            'class_label': self.CLASS_CATEGORIES.get(
                raw.get('sys_class_name'), 'Other'
            ),
            'operational_status': int(raw.get('operational_status', 0)),
            'install_status': int(raw.get('install_status', 0)),
            'environment': raw.get('environment', ''),
            'ip_address': raw.get('ip_address', ''),
            'company': self._resolve_ref(raw.get('company')),
            'location': self._resolve_ref(raw.get('location')),
            'managed_by': self._resolve_ref(raw.get('managed_by')),
            'owned_by': self._resolve_ref(raw.get('owned_by')),
            'short_description': raw.get('short_description', ''),
            'sys_updated_on': raw.get('sys_updated_on'),
            'sys_created_on': raw.get('sys_created_on'),
        }
```

### 5.5 Data Validation

```python
class CIValidator:
    """Validate CI records before loading into Kuzu."""
    
    REQUIRED_FIELDS = ['sys_id', 'name', 'sys_class_name']
    
    def validate(self, ci: dict) -> tuple[bool, list[str]]:
        errors = []
        
        # Required fields
        for field in self.REQUIRED_FIELDS:
            if not ci.get(field):
                errors.append(f"Missing required field: {field}")
        
        # sys_id format (32 hex chars)
        if ci.get('sys_id') and not re.match(r'^[a-f0-9]{32}$', ci['sys_id']):
            errors.append(f"Invalid sys_id format: {ci['sys_id']}")
        
        # Operational status range
        if ci.get('operational_status') and ci['operational_status'] not in range(1, 7):
            errors.append(f"Invalid operational_status: {ci['operational_status']}")
        
        return (len(errors) == 0, errors)
```

---

## 6. API Layer - FastAPI

### 6.1 Router Overview

| Endpoint | Method | Description | Avg Latency |
|----------|--------|-------------|-------------|
| `GET /api/graph/neighborhood/{ci_id}` | GET | k-hop subgraph around CI | < 100ms |
| `GET /api/graph/path/{source}/{target}` | GET | Shortest path between CIs | < 200ms |
| `GET /api/graph/clusters` | GET | Top-level cluster overview | < 500ms |
| `GET /api/graph/stats` | GET | Graph statistics | < 10ms |
| `GET /api/ci/{ci_id}` | GET | Full CI details | < 50ms |
| `GET /api/ci/{ci_id}/timeline` | GET | CI change history | < 100ms |
| `GET /api/search` | GET | Full-text search CIs | < 50ms |
| `GET /api/search/suggest` | GET | Autocomplete suggestions | < 30ms |
| `POST /api/etl/sync` | POST | Trigger manual sync | immediate |
| `GET /api/etl/status` | GET | Current ETL status | < 10ms |
| `GET /api/etl/logs` | GET | Recent ETL logs | < 50ms |
| `GET /health` | GET | Health check | < 5ms |
| `GET /ready` | GET | Readiness (all deps up) | < 50ms |
| `GET /metrics` | GET | Prometheus metrics | < 10ms |
| `WS /ws/etl` | WS | Real-time ETL updates | streaming |

### 6.2 Neighborhood API (Core Endpoint)

```python
@router.get("/neighborhood/{ci_id}")
async def get_neighborhood(
    ci_id: str,
    hops: int = Query(default=2, ge=1, le=3),
    max_nodes: int = Query(default=500, ge=10, le=2000),
    degree_threshold: int = Query(default=100, ge=10, le=1000),
    class_filter: list[str] = Query(default=None),
    env_filter: list[str] = Query(default=None),
    cache: CacheService = Depends(get_cache),
    graph: GraphService = Depends(get_graph),
) -> GraphResponse:
    """
    Return k-hop neighborhood subgraph around a CI.
    
    Strategy:
    1. Check Redis cache (key: neighborhood:{ci_id}:{hops}:{filters_hash})
    2. If miss: query Kuzu with degree threshold to prevent super-node explosion
    3. Apply class/env filters
    4. Truncate to max_nodes (keep highest-degree nodes)
    5. Compute positions if server-side layout enabled
    6. Cache result in Redis (TTL: 5 min)
    7. Return GraphResponse with nodes + edges + metadata
    """
    cache_key = f"neighborhood:{ci_id}:{hops}:{hash(str(class_filter))}:{hash(str(env_filter))}"
    
    cached = await cache.get(cache_key)
    if cached:
        return GraphResponse(**cached)
    
    result = await graph.get_neighborhood(
        ci_id=ci_id,
        hops=hops,
        max_nodes=max_nodes,
        degree_threshold=degree_threshold,
        class_filter=class_filter,
        env_filter=env_filter,
    )
    
    await cache.set(cache_key, result.dict(), ttl=300)
    return result
```

### 6.3 Response Models

```python
class GraphNode(BaseModel):
    id: str                    # sys_id
    name: str
    ci_class: str              # Simplified class label
    ci_class_raw: str          # Original sys_class_name
    environment: str
    operational_status: int
    degree: int                # Pre-computed edge count
    cluster_id: int            # Community detection result
    x: float | None = None    # Pre-computed position (if server layout)
    y: float | None = None
    z: float | None = None

class GraphEdge(BaseModel):
    source: str                # Source CI sys_id
    target: str                # Target CI sys_id
    rel_type: str              # Forward relationship name
    rel_type_reverse: str      # Reverse name

class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
    center_id: str             # The CI that was queried
    total_nodes_in_neighborhood: int  # Before truncation
    truncated: bool            # Whether max_nodes was hit
    query_time_ms: float       # Kuzu query time
    cached: bool               # Whether served from cache
```

### 6.4 Application Lifespan & Dependency Injection

```python
# app/main.py
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup/shutdown lifecycle."""
    # Startup
    kuzu_mgr = KuzuManager(settings.KUZU_DB_PATH)
    await kuzu_mgr.bootstrap_schema()
    
    redis_mgr = RedisManager(settings.REDIS_URL)
    await redis_mgr.connect()
    
    meili_mgr = MeiliManager(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
    await meili_mgr.bootstrap_index()
    
    app.state.kuzu = kuzu_mgr
    app.state.redis = redis_mgr
    app.state.meili = meili_mgr
    
    # Start incremental sync scheduler
    scheduler = ETLScheduler(kuzu_mgr, redis_mgr, meili_mgr)
    scheduler.start()
    
    yield
    
    # Shutdown
    scheduler.stop()
    await redis_mgr.disconnect()
    kuzu_mgr.close()

app = FastAPI(
    title="InfraNexus API",
    version="1.0.0",
    lifespan=lifespan,
)
```

---

## 7. Search Engine - Meilisearch

### 7.1 Index Configuration

```python
INDEX_SETTINGS = {
    'primaryKey': 'sys_id',
    'searchableAttributes': [
        'name',              # Primary: CI name
        'short_description', # Secondary: description
        'class_label',       # Tertiary: "Server", "Database"
        'ip_address',        # IP search
        'serial_number',     # Asset search
    ],
    'filterableAttributes': [
        'class',
        'class_label',
        'environment',
        'operational_status',
        'install_status',
        'company',
        'location',
    ],
    'sortableAttributes': [
        'name',
        'sys_updated_on',
        'class_label',
    ],
    'typoTolerance': {
        'enabled': True,
        'minWordSizeForTypos': {'oneTypo': 4, 'twoTypos': 8},
    },
    'pagination': {'maxTotalHits': 1000},
}
```

### 7.2 Search Service

```python
class SearchService:
    async def search(self, query: str, filters: dict, limit: int = 20) -> SearchResponse:
        """Full-text search with facets."""
        meili_filters = self._build_filters(filters)
        results = await self.meili.index('cmdb-cis').search(
            query,
            limit=limit,
            filter=meili_filters,
            attributes_to_highlight=['name', 'short_description'],
            facets=['class_label', 'environment', 'operational_status'],
        )
        return SearchResponse(
            hits=[SearchHit(**h) for h in results['hits']],
            total=results['estimatedTotalHits'],
            facets=results.get('facetDistribution', {}),
            query_time_ms=results['processingTimeMs'],
        )
    
    async def suggest(self, prefix: str, limit: int = 8) -> list[SuggestHit]:
        """Fast prefix autocomplete."""
        results = await self.meili.index('cmdb-cis').search(
            prefix,
            limit=limit,
            attributes_to_retrieve=['sys_id', 'name', 'class_label'],
        )
        return [SuggestHit(**h) for h in results['hits']]
```

### 7.3 Memory Estimates

| Scale | Index Size | RAM Usage |
|-------|-----------|-----------|
| 100K CIs | ~200 MB | ~400 MB |
| 500K CIs | ~1 GB | ~2 GB |
| 1M CIs | ~2 GB | ~4 GB |

---

## 8. Caching Layer - Redis

### 8.1 Cache Strategy

```
Layer 1: NEIGHBORHOOD CACHE (Redis Hash)
  Key: "nb:{ci_id}:{hops}:{filter_hash}"
  Value: Serialized GraphResponse (msgpack)
  TTL: 300s (5 min) - matches incremental sync interval
  Strategy: Read-through (query Kuzu on miss, cache result)

Layer 2: CI DETAIL CACHE (Redis Hash)
  Key: "ci:{ci_id}"
  Value: Full CI detail JSON
  TTL: 600s (10 min)
  Strategy: Read-through

Layer 3: SEARCH CACHE (Redis String)
  Key: "search:{query_hash}"
  Value: Search results JSON
  TTL: 60s (1 min) - search results change more frequently
  Strategy: Read-through

Layer 4: ETL STATE (Redis Hash)
  Key: "etl:state"
  Fields: last_sync, status, progress, total_cis, total_rels
  TTL: None (persistent)

Layer 5: RATE LIMIT (Redis Sorted Set)
  Key: "rl:{ip}"
  Strategy: Sliding window rate limiter
  Window: 60s, Limit: 100 requests
```

### 8.2 Cache Invalidation

```python
class CacheService:
    async def invalidate_ci(self, ci_id: str):
        """Invalidate all caches related to a CI."""
        # Delete CI detail cache
        await self.redis.delete(f"ci:{ci_id}")
        
        # Delete all neighborhood caches containing this CI
        # Use Redis SCAN to find matching keys
        async for key in self.redis.scan_iter(f"nb:{ci_id}:*"):
            await self.redis.delete(key)
        
        # Also invalidate neighbors' caches (they may include this CI)
        # This is done at ETL time by querying Kuzu for adjacent CIs
    
    async def invalidate_search(self):
        """Clear all search caches after sync."""
        async for key in self.redis.scan_iter("search:*"):
            await self.redis.delete(key)
```

### 8.3 Memory Budget

| Component | Memory |
|-----------|--------|
| Neighborhood cache (10K entries) | ~500 MB |
| CI detail cache (100K entries) | ~200 MB |
| Search cache (1K entries) | ~50 MB |
| Rate limit state | ~10 MB |
| ETL state | ~1 MB |
| **Total** | **~750 MB** |

Redis configured with 2 GB maxmemory and allkeys-lru eviction.

---

## 9. WebSocket Real-Time Layer

### 9.1 WebSocket Events

```python
# Real-time events from backend to frontend

# ETL Progress
{"type": "etl_progress", "data": {"status": "syncing", "progress": 45, "records_processed": 4500}}

# ETL Complete
{"type": "etl_complete", "data": {"total_cis": 1000000, "total_rels": 3500000, "duration_s": 120}}

# CI Updated (for live graph updates)
{"type": "ci_updated", "data": {"sys_id": "abc123", "fields_changed": ["operational_status"]}}

# Cache Invalidated
{"type": "cache_invalidated", "data": {"ci_ids": ["abc123", "def456"]}}
```

### 9.2 Implementation

```python
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []
    
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)
    
    async def broadcast(self, event: dict):
        for ws in self.active:
            try:
                await ws.send_json(event)
            except WebSocketDisconnect:
                self.active.remove(ws)
```

---

## 10. Performance Engineering

### 10.1 Kuzu Query Optimization

1. **Indexed lookups**: Primary key index on `sys_id` - O(1) node lookup
2. **Degree pre-computation**: Store degree on CI node, updated during ETL
3. **Super-node guards**: Never expand nodes with degree > threshold in neighborhood queries
4. **Result streaming**: Use Kuzu's result iterator, don't materialize full result sets
5. **Connection pooling**: 4 reader connections (match CPU cores)

### 10.2 API Response Optimization

1. **msgpack serialization**: For cache storage (2-3x smaller than JSON)
2. **Streaming JSON**: For large responses (> 1000 nodes)
3. **Field selection**: Client specifies which fields to return
4. **Compression**: gzip response for > 10KB payloads

### 10.3 Server-Side Layout Pre-computation

For neighborhoods > 200 nodes, pre-compute force-directed layout positions:

```python
class LayoutService:
    """Pre-compute node positions using networkx + scipy."""
    
    def compute_layout(self, nodes: list, edges: list, algorithm: str = 'spring') -> dict:
        G = nx.Graph()
        G.add_nodes_from([n['id'] for n in nodes])
        G.add_edges_from([(e['source'], e['target']) for e in edges])
        
        if algorithm == 'spring':
            pos = nx.spring_layout(G, dim=3, k=1/sqrt(len(nodes)), iterations=50)
        elif algorithm == 'kamada_kawai':
            pos = nx.kamada_kawai_layout(G, dim=3)
        
        return {node_id: {'x': p[0], 'y': p[1], 'z': p[2]} for node_id, p in pos.items()}
```

---

## 11. Security Architecture

### 11.1 Authentication & Authorization

- **Phase 1 (local-first)**: No authentication (single-user, localhost only)
- **Phase 2 (team)**: API key authentication via `X-API-Key` header
- **Phase 3 (enterprise)**: OAuth2/OIDC with ServiceNow SSO integration

### 11.2 Input Validation

- All path parameters validated via Pydantic (sys_id format: 32 hex chars)
- Query parameters bounded (hops: 1-3, max_nodes: 10-2000)
- Rate limiting: 100 req/min per IP via Redis sliding window
- No raw Cypher injection - all queries use parameterized statements

### 11.3 ServiceNow Credentials

- Stored in `.env.local` (never committed)
- Backend reads via Pydantic Settings (environment variables)
- Credentials never logged or returned in API responses

---

## 12. Observability & Monitoring

### 12.1 Structured Logging

```python
import structlog

logger = structlog.get_logger()

# Every log entry includes:
# - request_id (from middleware)
# - timestamp
# - level
# - module
logger.info("neighborhood_query", ci_id=ci_id, hops=hops, 
            result_nodes=len(nodes), query_ms=elapsed_ms, cached=from_cache)
```

### 12.2 Metrics (Prometheus-compatible)

| Metric | Type | Labels |
|--------|------|--------|
| `infranexus_request_duration_seconds` | Histogram | method, path, status |
| `infranexus_kuzu_query_seconds` | Histogram | query_type |
| `infranexus_cache_hits_total` | Counter | cache_type |
| `infranexus_cache_misses_total` | Counter | cache_type |
| `infranexus_etl_records_processed` | Counter | record_type |
| `infranexus_etl_sync_duration_seconds` | Gauge | sync_type |
| `infranexus_active_ws_connections` | Gauge | - |

---

## 13. Error Handling Strategy

```python
# Custom exception hierarchy
class InfraNexusError(Exception): ...
class CINotFoundError(InfraNexusError): ...
class KuzuQueryError(InfraNexusError): ...
class SnowAuthError(InfraNexusError): ...
class SnowRateLimitError(InfraNexusError): ...
class ETLAlreadyRunningError(InfraNexusError): ...

# Global exception handler
@app.exception_handler(InfraNexusError)
async def handle_infranexus_error(request, exc):
    status_map = {
        CINotFoundError: 404,
        KuzuQueryError: 500,
        SnowAuthError: 401,
        SnowRateLimitError: 429,
        ETLAlreadyRunningError: 409,
    }
    return JSONResponse(
        status_code=status_map.get(type(exc), 500),
        content={"error": str(exc), "type": type(exc).__name__},
    )
```

---

## 14. Deployment & Infrastructure

### 14.1 Docker Images

**Backend Dockerfile:**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
# Single worker because Kuzu is embedded (single-process)
```

### 14.2 Resource Requirements

| Service | CPU | Memory | Disk |
|---------|-----|--------|------|
| Backend (FastAPI + Kuzu) | 2 cores | 4 GB | 10 GB (Kuzu data) |
| Redis | 0.5 cores | 2 GB | 500 MB |
| Meilisearch | 1 core | 4 GB | 5 GB |
| Frontend (Next.js) | 0.5 cores | 512 MB | 200 MB |
| **Total** | **4 cores** | **~11 GB** | **~16 GB** |

---

## 15. Testing Strategy

### 15.1 Test Pyramid

| Layer | Tool | Coverage Target |
|-------|------|----------------|
| Unit tests | pytest + pytest-asyncio | Services, transformers, validators |
| Integration tests | pytest + testcontainers | Kuzu queries, Redis caching, Meili search |
| API tests | httpx + FastAPI TestClient | All endpoints, error cases |
| Load tests | locust | Neighborhood queries at 1M scale |
| ETL tests | pytest | Full sync + incremental sync flows |

### 15.2 Test Fixtures

```python
@pytest.fixture
def kuzu_test_db(tmp_path):
    """Create a temporary Kuzu database with test data."""
    db = kuzu.Database(str(tmp_path / "test.kuzu"))
    conn = kuzu.Connection(db)
    # Bootstrap schema + insert test CIs
    return db

@pytest.fixture
def sample_graph():
    """Create a realistic test graph: 100 CIs, 300 relationships."""
    # Business service → 5 apps → 5 servers each → 1 OS each
    ...
```

---

## 16. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Project scaffolding (pyproject.toml, Docker, docker-compose)
- [ ] Kuzu schema bootstrap + connection manager
- [ ] Redis manager + connection
- [ ] Meilisearch index setup
- [ ] Basic health check endpoint
- [ ] FastAPI app with lifespan

### Phase 2: ETL Pipeline (Week 2-3)
- [ ] ServiceNow REST client with pagination + retry
- [ ] CI transformer + validator
- [ ] Kuzu bulk loader (COPY)
- [ ] Meilisearch batch indexer
- [ ] State manager (Redis)
- [ ] Full sync runner (CLI)
- [ ] Incremental sync runner
- [ ] APScheduler integration

### Phase 3: Core API (Week 3-4)
- [ ] Neighborhood endpoint (k-hop query)
- [ ] CI detail endpoint
- [ ] Search endpoint (Meilisearch integration)
- [ ] Autocomplete/suggest endpoint
- [ ] Redis caching layer (read-through)
- [ ] Cache invalidation on sync
- [ ] Rate limiting middleware

### Phase 4: Advanced Features (Week 4-5)
- [ ] Shortest path endpoint
- [ ] Cluster overview endpoint
- [ ] Server-side layout pre-computation
- [ ] WebSocket ETL updates
- [ ] Degree pre-computation
- [ ] Community detection (Louvain)
- [ ] Graph statistics endpoint

### Phase 5: Production Hardening (Week 5-6)
- [ ] Structured logging (structlog)
- [ ] Prometheus metrics
- [ ] Request ID middleware
- [ ] Server-Timing headers
- [ ] Comprehensive error handling
- [ ] Load testing (locust)
- [ ] API documentation (OpenAPI)

---

*This document is the single source of truth for backend architecture decisions. All implementation must follow this plan.*
