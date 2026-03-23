---
name: testing-and-quality
description: "Use when: creating or improving test strategy, unit/integration/e2e coverage, load testing, and quality gates for InfraNexus backend/frontend. Keywords: pytest, vitest, playwright, locust, regression, coverage."
---

# Testing And Quality

## Goal
Prevent regressions in graph correctness, performance, and UX through layered testing.

## Use When
- Adding new endpoints/services/components.
- Refactoring merge logic or query logic.
- Building release quality gates.
- Investigating flaky behavior.

## Test Pyramid
- Unit tests: transformers, validators, store reducers, merge helpers.
- Integration tests: Kuzu queries, Redis caching flows, Meilisearch search behavior.
- API tests: request validation, error handling, response contracts.
- E2E tests: search -> navigate -> expand -> inspect flow.
- Performance tests: neighborhood latency and frame-rate thresholds.

## Required Coverage Focus
1. Neighborhood truncation behavior.
2. Super-node degree threshold handling.
3. sys_id validation at boundaries.
4. Incremental sync correctness and idempotency.
5. Frontend merge preserving node positions.

## Quality Gates
- No broken contracts for typed API payloads.
- No significant p95 latency regressions.
- No critical accessibility regressions on core flows.

## Output Checklist
- Test plan tied to changed scope.
- Added/updated automated tests.
- Performance checks for hot paths.
- Explicit residual risk notes if coverage is partial.
