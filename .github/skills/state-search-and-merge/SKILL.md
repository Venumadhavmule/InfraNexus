---
name: state-search-and-merge
description: "Use when: implementing Zustand store architecture, SWR data patterns, search/autocomplete behavior, and neighborhood merge logic for InfraNexus. Keywords: graphStore, uiStore, etlStore, debounce, dedupe, Map merge."
---

# State Search And Merge

## Goal
Keep client state predictable and fast while supporting progressive graph expansion.

## Use When
- Designing stores in src/store.
- Building hooks in src/hooks.
- Implementing search UX and debounce behavior.
- Writing merge utilities in src/lib/graphMerge.ts.

## State Rules
1. Use Map for nodes and edges for O(1) lookup.
2. Keep graph, ui, and etl concerns in separate stores.
3. Preserve simulation coordinates when updating existing nodes.
4. Dedupe edges with deterministic composite keys.
5. Track expandedNodeIds to avoid redundant fetches.

## Search Rules
- Debounce query input.
- Use suggest endpoint for quick prefix matches.
- On selection: load neighborhood, center camera, set selection.
- Keep result ranking stable with class/environment facets.

## Output Checklist
- Strongly typed store contracts.
- Deterministic merge behavior.
- Search hook with loading/error handling.
- Selection and expansion flows that never reset full scene unexpectedly.
