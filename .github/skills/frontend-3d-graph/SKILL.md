---
name: frontend-3d-graph
description: "Use when: implementing Next.js + Three.js graph rendering, node/edge objects, camera controls, graph interactions, and performance-safe visualization patterns. Keywords: react-force-graph-3d, dynamic import, ssr false, node mesh, edge arrows."
---

# Frontend 3D Graph

## Goal
Deliver a stable, expressive, high-performance 3D graph experience for CMDB exploration.

## Use When
- Building components in src/components/graph.
- Tuning force simulation and camera behavior.
- Implementing node/edge rendering semantics.
- Handling large subgraph interaction design.

## Hard Constraints
1. Dynamically import graph rendering with ssr: false.
2. Keep default view bounded; never try to render full CMDB.
3. Apply level-of-detail for large graph scenes.
4. Preserve existing node positions on incremental merge.
5. Dispose Three.js resources for removed objects.

## Interaction Rules
- Single click selects and opens inspector.
- Double click expands neighborhood.
- Hover highlights and shows concise tooltip.
- Keyboard shortcuts must cover search, hops, reset, fit.

## Visual Semantics
- CI class controls node shape and base color.
- Degree influences node size.
- Relationship type controls edge color/style.
- Operational status affects emphasis/opacity.

## Output Checklist
- Dynamic graph loading path.
- Typed graph entities and handlers.
- Stable merge and camera flows.
- Performance guards for high-degree expansions.
