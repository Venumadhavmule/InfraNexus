---
applyTo: "frontend/**"
---

# InfraNexus Frontend Skill

You are an expert frontend engineer building the InfraNexus ServiceNow CMDB Graph Visualizer frontend.

## Project Context

InfraNexus renders ServiceNow CMDB infrastructure as an interactive 3D WebGL force-directed graph in the browser. Built with Next.js 15, React 19, Three.js, and react-force-graph-3d, inspired by GitNexus (gitnexus.vercel.app).

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + TypeScript 5
- **3D Rendering**: Three.js + react-force-graph-3d
- **State**: Zustand 5
- **Data Fetching**: SWR 2
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Testing**: Vitest + React Testing Library + Playwright

## Architecture Rules

### Three.js / react-force-graph-3d
- **ALWAYS dynamically import** the graph component (`dynamic(() => import(...), { ssr: false })`)
- Three.js + force-graph bundle is ~700KB - NEVER include in initial bundle
- WebGL cannot render server-side - set `ssr: false` on graph imports
- Max visible nodes: 500 default, 2000 absolute maximum
- Use `InstancedMesh` when rendering 500+ nodes of the same class
- Implement Level-of-Detail (LOD): full mesh at close range, point sprites at distance
- **Dispose** Three.js geometries and materials when nodes are removed (memory leak prevention)
- Configure D3 force simulation: charge=-120, alphaDecay=0.02, warmupTicks=100

### Node Rendering
- Each CI class maps to a unique shape + color:
  - Server → Box (#4F46E5), VM → Sphere (#7C3AED), Database → Cylinder (#059669)
  - Application → Octahedron (#D97706), Service → Torus (#DC2626)
  - Load Balancer → Sphere (#0891B2), Network → Octahedron (#65A30D)
  - Kubernetes → Octahedron (#326CE5), Container → Box (#2496ED)
- Node size scales with degree: `baseSize * (1 + log2(degree) * 0.15)`
- Non-operational CIs render as gray (#6B7280) regardless of class
- Text labels via `three-spritetext`, positioned above node

### Edge Rendering
- Colored by relationship type (12+ colors)
- "Depends on" edges thicker (critical paths)
- Directional arrows at midpoint
- Dashed lines for hierarchical (Contains, Members of)
- Solid lines for operational (Runs on, Depends on)

### State Management (Zustand)
Three stores, never mix concerns:

1. **graphStore**: nodes (Map), edges (Map), selectedNodeId, hoveredNodeId, expandedNodeIds, filters
2. **uiStore**: leftPanelOpen, rightPanelOpen, hopDepth, layoutMode, theme, showLabels, showMiniMap
3. **etlStore**: status, progress, lastSync, totalCIs, totalRelationships

```typescript
// ALWAYS use Map for nodes/edges - O(1) lookup by ID
nodes: Map<string, GraphNode>
edges: Map<string, GraphLink>

// Edge dedup key: `${source}-${target}-${rel_type}`
```

### Graph Merge (Critical Algorithm)
When expanding a node's neighborhood:
1. Merge new nodes into existing Map (update data, preserve x/y/z positions)
2. Merge new edges (dedup by key)
3. New nodes inherit position of clicked node (then force sim pushes them outward)
4. Force simulation re-equilibrates gently (don't reset)
5. Mark node as "expanded" to prevent re-fetching

### Data Fetching
- Use SWR for CI details, search results (stale-while-revalidate)
- Use direct `fetch` for neighborhood expansion (imperative, not cached by SWR)
- Debounce search input: 150ms
- API base URL from `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)
- Frontend calls FastAPI backend directly - NO Next.js API proxy routes
- Typed API client in `lib/api.ts`

### Component Rules
- Graph components (`components/graph/`) handle Three.js rendering
- Panel components (`components/panels/`) handle UI overlays
- Search components (`components/search/`) handle search UX
- Control components (`components/controls/`) handle graph settings
- UI components (`components/ui/`) are shadcn/ui primitives only

### Performance
- Initial bundle must be < 500KB gzipped
- Three.js chunk loaded asynchronously after shell renders
- Use `React.memo()` on panel components (they shouldn't re-render on graph changes)
- Use `useCallback` for all event handlers passed to ForceGraph3D
- Camera animations: 1000ms duration with smooth easing
- Graph skeleton shows during Three.js load (loading state)

### Layout
```
┌─── Search Bar ──────────────────────────────────────┐
├── Left Panel ──┬── Graph Canvas (WebGL) ──┬── Right ┤
│  Legend         │                          │ Zoom    │
│  Filters        │  3D Force Graph          │ Layout  │
│  Inspector     │                          │ Hops    │
└────────────────┴──────────────────────────┴─────────┘
└── Status Bar ───────────────────────────────────────┘
```

### Theme
- Dark theme: `#0A0A0F` background, `#818CF8` accent
- Light theme: `#FAFAFA` background, `#4F46E5` accent
- Graph canvas: darker than UI surface for immersive feel
- CI colors are CONSISTENT across themes (same palette)
- Use CSS custom properties or Tailwind `dark:` variants

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| `/` | Focus search |
| `Escape` | Clear selection / close panel |
| `1`, `2`, `3` | Set hop depth |
| `R` | Reset graph |
| `F` | Fit to view |
| `Space` | Expand selected node |

### Accessibility
- Shapes (not just colors) distinguish CI types
- All controls keyboard-accessible
- `aria-label` on all interactive elements
- Screen reader announcements for node selection
- Support `prefers-reduced-motion`

## File Organization

```
frontend/src/
├── app/                 # Next.js App Router pages
├── components/
│   ├── graph/          # 3D graph rendering
│   ├── panels/         # Side panels (inspector, filters)
│   ├── search/         # Search bar + results
│   ├── controls/       # Graph controls (hops, layout, theme)
│   └── ui/             # shadcn/ui primitives
├── hooks/              # Custom React hooks
├── store/              # Zustand stores
├── lib/                # Utilities (api, merge, colors, sizes)
└── types/              # TypeScript type definitions
```

## Common Patterns

### Dynamic Graph Import
```typescript
const CMDBGraph = dynamic(() => import('@/components/graph/CMDBGraph'), {
  ssr: false,
  loading: () => <GraphSkeleton />,
});
```

### Store Usage
```typescript
// Select specific fields to avoid unnecessary re-renders
const selectedNodeId = useGraphStore(s => s.selectedNodeId);
const nodes = useGraphStore(s => s.filteredNodes);
```

### API Call
```typescript
const response = await api.getNeighborhood(ciId, {
  hops: hopDepth,
  maxNodes: 500,
  degreeThreshold: 100,
});
useGraphStore.getState().mergeNeighborhood(response);
```

## Testing Requirements
- `graphMerge.ts`: Unit tests for merge without duplicates, position preservation
- Store reducers: Test filter toggling, selection, reset
- SearchBar: Component test for debounced input, suggestion rendering
- Graph page: Playwright E2E for search → expand → inspect flow
