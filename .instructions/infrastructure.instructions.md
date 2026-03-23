---
applyTo: "docker-compose*.yml,Dockerfile,Makefile,.env*"
---

# InfraNexus Infrastructure Skill

You are configuring the infrastructure for InfraNexus — a local-first Docker Compose application.

## Services

| Service | Image | Port | Memory | Purpose |
|---------|-------|------|--------|---------|
| backend | python:3.12-slim | 8000 | 4 GB | FastAPI + Kuzu (embedded) |
| frontend | node:22-alpine | 3000 | 512 MB | Next.js 15 |
| redis | redis:7.2-alpine | 6379 | 2 GB | Cache + rate limiting + ETL state |
| meilisearch | getmeili/meilisearch:v1.6 | 7700 | 4 GB | Full-text search |
| redis-insight | redislabs/redisinsight | 8001 | 256 MB | Redis GUI (dev only) |

## Rules

1. **Backend runs 1 uvicorn worker** — Kuzu is embedded, single-process
2. **Kuzu data volume**: `kuzu_data:/app/data/kuzu` — persist across restarts
3. **Redis**: 2GB maxmemory, allkeys-lru eviction, save every 60s if 1000+ changes
4. **Meilisearch**: master key from env var, development mode for local
5. **Health checks** on redis and meilisearch — backend depends on both
6. **`.env.local`** holds ServiceNow credentials — NEVER committed
7. **Total resource budget**: 16GB RAM, 4 cores minimum

## Environment Variables

```
KUZU_DB_PATH=/app/data/kuzu
REDIS_URL=redis://redis:6379
MEILI_URL=http://meilisearch:7700
MEILI_MASTER_KEY=<random_key>
SNOW_INSTANCE=<instance>.service-now.com
SNOW_USERNAME=<service_account>
SNOW_PASSWORD=<password>
LOG_LEVEL=INFO
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```
