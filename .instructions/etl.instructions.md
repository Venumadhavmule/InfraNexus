---
applyTo: "backend/etl/**"
---

# InfraNexus ETL Pipeline Skill

You are building the ServiceNow ETL pipeline for InfraNexus.

## Purpose

Extract CIs and relationships from ServiceNow CMDB, transform them into canonical format, validate, and load into Kuzu (graph DB) + Meilisearch (search index).

## ServiceNow Table API

### Endpoints
- CIs: `GET /api/now/table/cmdb_ci`
- Relationships: `GET /api/now/table/cmdb_rel_ci`
- Relationship Types: `GET /api/now/table/cmdb_rel_type`

### Query Parameters
- `sysparm_query` - Encoded query (e.g., `sys_updated_on>=2026-03-20`)
- `sysparm_fields` - Comma-separated field list (always specify, never `*`)
- `sysparm_limit` - Max records per page (use 1000)
- `sysparm_offset` - Pagination offset

### Rate Limiting
- ServiceNow allows ~30 requests/minute for table API
- Use 1.4 req/s maximum with exponential backoff on 429 responses
- Backoff formula: `delay = min(2^attempt * base_delay, max_delay)`

### Authentication
- Basic auth with service account credentials
- Credentials from environment variables: `SNOW_INSTANCE`, `SNOW_USERNAME`, `SNOW_PASSWORD`
- Never log credentials, never include in error messages

## Data Model

### CI Fields to Fetch
```
sys_id, name, sys_class_name, operational_status, install_status,
environment, ip_address, dns_domain, company, department, location,
managed_by, owned_by, asset_tag, serial_number, short_description,
sys_updated_on, sys_created_on
```

### Relationship Fields to Fetch
```
sys_id, parent, child, type, sys_updated_on
```

### Validation Rules
- `sys_id`: Must be 32 lowercase hex characters
- `name`: Required, non-empty
- `sys_class_name`: Required, must be known CMDB class
- `operational_status`: 1-6 range
- `install_status`: 1-8 range

## Sync Modes

### Full Sync (first run)
1. Fetch all `cmdb_rel_type` records → build lookup map
2. Fetch all CIs → transform → validate → write CSV
3. Fetch all relationships → transform (resolve types) → validate → write CSV
4. Kuzu COPY CI CSV, then COPY REL CSV
5. Meilisearch batch import
6. Compute degree counts
7. Store sync state in Redis

### Incremental Sync (recurring)
1. Read `last_sync` from Redis `etl:state`
2. Fetch CIs where `sys_updated_on >= last_sync`
3. For each: MERGE into Kuzu, upsert in Meilisearch
4. Fetch relationships where `sys_updated_on >= last_sync`
5. For each: MERGE into Kuzu
6. Invalidate Redis cache for affected CI neighborhoods
7. Update `last_sync` timestamp
8. Broadcast WebSocket event

## Class Category Mapping
```python
CLASS_CATEGORIES = {
    'cmdb_ci_server': 'Server',
    'cmdb_ci_win_server': 'Server',
    'cmdb_ci_linux_server': 'Server',
    'cmdb_ci_vm_instance': 'Virtual Machine',
    'cmdb_ci_database': 'Database',
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
}
```

## Error Handling
- Network errors: retry with exponential backoff (max 5 attempts)
- 401: Log auth error, stop sync, notify via WebSocket
- 429: Honor Retry-After header, increase backoff
- Invalid records: Log warning, skip record, continue sync
- Kuzu write failures: Log error, retry once, fail sync if persistent
