---
name: backend-api-graph
description: "Use when: implementing FastAPI routers/services for neighborhood, path, CI detail, and graph statistics using Kuzu + Redis + Meilisearch. Keywords: FastAPI, k-hop, Cypher, graph service, response models, dependency injection."
---

# Backend API Graph

## Goal
Implement high-performance graph APIs with strict contracts and safe query patterns.

## Use When
- Creating endpoints in app/routers.
- Writing service logic in app/services.
- Defining Pydantic request/response models.
- Adding dependency injection wiring.

## Hard Constraints
1. Kuzu is embedded; backend must run with one uvicorn worker.
2. All Cypher queries must be parameterized.
3. Never return full graph; return bounded subgraphs only.
4. Max nodes in response must be capped.
5. Add query timing metadata to responses.

## API Contract Baseline
- GET /api/graph/neighborhood/{ci_id}
- GET /api/graph/path/{source_id}/{target_id}
- GET /api/ci/{ci_id}
- GET /api/search
- GET /api/search/suggest
- GET /health and /ready

## Implementation Pattern
- Router handles validation and HTTP concerns.
- Service layer handles business and orchestration.
- Core managers handle data source lifecycle.
- Middleware handles request_id, timing, and rate limits.

## Response Quality
- Include center_id, truncated flag, query_time_ms, and cached fields for neighborhood responses.
- Keep model names stable and explicit.
- Surface user-safe error messages and structured error types.

## Output Checklist
- Typed models for all API payloads.
- Parameterized query functions with tests.
- Cache-aware service flow.
- Middleware coverage for timing and request tracing.
