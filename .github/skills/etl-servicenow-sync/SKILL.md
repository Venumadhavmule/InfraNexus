---
name: etl-servicenow-sync
description: "Use when: building or modifying ServiceNow ETL full/incremental sync, pagination, retry/backoff, transformers, validators, and Kuzu/Meilisearch loaders. Keywords: sys_updated_on, cmdb_ci, cmdb_rel_ci, APScheduler, delta sync."
---

# ETL ServiceNow Sync

## Goal
Build resilient, auditable ETL that keeps graph/search stores fresh with minimal load on ServiceNow.

## Use When
- Implementing etl/runner.py workflows.
- Updating snow_client.py pagination/retry logic.
- Writing transformer.py and validators.py.
- Maintaining state_manager.py and scheduler.py.

## Hard Constraints
1. Respect ServiceNow rate limit around 1.4 req/s.
2. Use exponential backoff for 429/5xx failures.
3. Use sys_updated_on bookmarks for incremental sync.
4. Validate sys_id and required fields before load.
5. Invalidate affected cache keys after writes.

## Sync Modes
- Full sync: bootstrap relation types, load all CIs, load all relationships, index search.
- Incremental sync: only changed rows by sys_updated_on, then upsert and invalidate caches.

## Data Integrity Rules
- Reject malformed records with reasoned logging.
- Keep counts: fetched, accepted, rejected, written.
- Update last_sync only after successful completion.
- Ensure idempotent upsert behavior.

## Output Checklist
- Deterministic full sync pipeline.
- Robust incremental sync with bookmark safety.
- Clear ETL status model and progress events.
- Backoff + retry test coverage.
