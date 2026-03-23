---
name: observability-and-performance
description: "Use when: instrumenting latency, cache efficiency, ETL throughput, and troubleshooting slow graph/search behavior in InfraNexus. Keywords: metrics, server timing, structlog, p95, cache hit ratio, profiling."
---

# Observability And Performance

## Goal
Make system behavior measurable and optimize bottlenecks with evidence.

## Use When
- API latency exceeds targets.
- Cache hit ratio drops.
- ETL sync duration increases.
- Frontend frame-rate degrades.

## Required Telemetry
- Request duration by endpoint.
- Kuzu query duration by query type.
- Redis hit/miss counters by cache category.
- Meilisearch query processing time.
- ETL throughput and reject counts.
- Active websocket connections.

## Performance Targets
- Neighborhood uncached < 100ms.
- Neighborhood cached < 10ms.
- Suggest < 30ms.
- Search < 50ms.
- First meaningful render < 2s.

## Tuning Levers
1. Cache key design and TTL fit.
2. Degree threshold and max_nodes bounds.
3. Query shape simplification.
4. LOD and draw-call reduction in frontend.
5. Bulk ETL batching and retry strategy.

## Output Checklist
- Metrics added at changed hot paths.
- Baseline before and after comparison.
- Clear bottleneck statement.
- Specific optimization with rollback-safe scope.
