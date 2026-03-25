# InfraNexus Frontend

Next.js 16 + React 19 application that renders ServiceNow CMDB data as an interactive 3D WebGL force-directed graph. Visualizes up to 2000 nodes using `react-force-graph-3d` and Three.js.

## Prerequisites

- Node.js 20+
- npm 10+
- InfraNexus backend running on port 8000 (see `backend/README.md`)

## Quick Start

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local if your backend runs on a different host/port

# Start dev server
npm run dev
# → http://localhost:3000
```

Or via Docker Compose from the repo root:

```bash
docker compose up frontend
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL (no trailing slash) |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | WebSocket base URL (no trailing slash) |

`.env.local` example:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests once (vitest) |
| `npm run test:watch` | Run tests in watch mode |

## Architecture

```
src/
├── app/
│   ├── layout.tsx             # Root layout: Geist font, providers, Toaster, KeyboardHelp
│   ├── page.tsx               # Redirects to /graph
│   └── graph/
│       └── page.tsx           # Main app: panels + graph + WebSocket init
├── components/
│   ├── graph/
│   │   ├── CMDBGraph.tsx      # Dynamic-import wrapper (ssr: false)
│   │   ├── GraphCanvas.tsx    # ForceGraph3D renderer — 8 geometry shapes
│   │   ├── GraphStats.tsx     # Node / edge count badges + truncated warning
│   │   └── WebGLFallback.tsx  # detectWebGL() + graceful fallback UI
│   ├── panels/
│   │   ├── LeftPanel.tsx      # Slide-in CI inspector (translate-x transition)
│   │   ├── CIInspector.tsx    # 22+ CI fields via SWR
│   │   ├── RelationshipList.tsx  # Incoming/outgoing rels, expand-on-click
│   │   └── RightPanel.tsx     # Filter + controls panel
│   ├── controls/
│   │   ├── HopDepthControl.tsx   # 1 / 2 / 3 hop buttons
│   │   ├── NodeTypeFilter.tsx    # CI class checkboxes with colour dots
│   │   ├── EdgeTypeFilter.tsx    # Relationship type checkboxes
│   │   ├── LayoutSelector.tsx    # force3d / dagre / radial
│   │   └── ThemeToggle.tsx       # Sun / moon icon button
│   ├── search/
│   │   ├── SearchBar.tsx         # Search overlay with debounced suggestions
│   │   └── SearchResults.tsx     # Suggestion + full-result cards
│   └── ui/
│       ├── StatusBar.tsx         # Fixed bottom bar: counts + ETL pulse
│       ├── GraphSkeleton.tsx     # Loading skeleton overlay
│       ├── KeyboardHelp.tsx      # ? dialog — all 12 shortcuts
│       └── ErrorFallback.tsx     # React class component error boundary
├── hooks/
│   ├── useNeighborhood.ts    # loadNeighborhood (replace) + expandNode (merge)
│   ├── useSearch.ts          # Debounced suggest + paginated full search
│   ├── useCI.ts              # SWR: CI detail + timeline for selected node
│   ├── useCamera.ts          # flyToNode / resetCamera / zoomToFit callbacks
│   ├── useWebSocket.ts       # ETL WS with exponential-backoff reconnect
│   ├── useGraphFilters.ts    # useMemo filtered nodes/edges from store state
│   ├── useKeyboardNav.ts     # 12 global keyboard shortcuts
│   └── useDarkMode.ts        # Zustand theme → document.documentElement.dark
├── store/
│   ├── graphStore.ts         # Map<string, GraphNode/GraphLink> + filters
│   ├── uiStore.ts            # Panel/theme/layout prefs (localStorage persist)
│   └── etlStore.ts           # ETL status driven by WebSocket events
├── lib/
│   ├── api.ts                # Typed fetch client + APIError / NetworkError
│   ├── colorMap.ts           # CI class → shape / colour / size / glow
│   ├── edgeStyles.ts         # Relationship type → colour / dashed / width
│   ├── graphMerge.ts         # Position-preserving graph merge algorithm
│   ├── constants.ts          # All magic values centralised
│   └── utils.ts              # cn(), formatCount, formatDuration, sysId helpers
└── types/
    ├── graph.ts              # GraphNode, GraphLink, response types
    ├── api.ts                # All API response/request types
    ├── ui.ts                 # LayoutMode, ThemeMode, HopDepth, PanelState
    └── index.ts              # Re-exports
```

## State Architecture

| Store | Responsibility | Persisted |
|-------|---------------|-----------|
| `graphStore` | Node/edge Maps, selection, filters, query options | No |
| `uiStore` | Theme, layout mode, panel visibility, display toggles | Yes (localStorage) |
| `etlStore` | ETL progress, sync history, last error, next schedule | No |

`graphStore` uses `Map<string, T>` for O(1) node/edge lookup — required for smooth interaction at 2000 nodes.

## Graph Merge Algorithm

When expanding a node, `lib/graphMerge.ts` preserves force-simulation positions:

1. Convert API response to `{nodes: Map, edges: Map}`
2. For each incoming node already in the graph, copy its `x/y/z/vx/vy/vz/fx/fy/fz` values
3. Deduplicate edges by composite key `source::rel_type::target`
4. Return new Maps (immutable Zustand update pattern)

Prevents the graph from "teleporting" when neighbour data is refreshed.

## 3D Node Shapes

| CI Class | Shape | Hex Colour |
|----------|-------|-----------|
| `cmdb_ci_server` | Box | `#4FC3F7` |
| `cmdb_ci_vm_instance` | Sphere | `#81C784` |
| `cmdb_ci_database` | Cylinder | `#FFB74D` |
| `cmdb_ci_appl` | Dodecahedron | `#CE93D8` |
| `cmdb_ci_service` | Icosahedron | `#F48FB1` |
| `cmdb_ci_lb_server` | Torus | `#80DEEA` |
| `cmdb_ci_netgear` | Octahedron | `#A5D6A7` |
| `cmdb_ci_firewall` | Cone | `#EF9A9A` |
| `cmdb_ci_storage_server` | Cylinder | `#FFCC02` |
| `cmdb_ci_container` | Sphere | `#B3E5FC` |
| `cmdb_ci_kubernetes_cluster` | Icosahedron | `#326CE5` |
| `cmdb_ci_business_service` | Dodecahedron | `#FF8A65` |
| *(default)* | Sphere | `#90A4AE` |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Open search |
| `Esc` | Close search / deselect node |
| `1` / `2` / `3` | Set hop depth |
| `R` | Reset camera |
| `F` | Zoom to fit |
| `L` | Toggle labels |
| `M` | Toggle minimap |
| `D` | Toggle dark mode |
| `[` | Toggle left panel |
| `]` | Toggle right panel |
| `?` | Toggle keyboard help |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | WebSocket base URL |

## Performance Budgets

| Metric | Target |
|--------|--------|
| Max nodes rendered | 2 000 |
| Initial JS bundle (excl. Three.js) | < 200 KB |
| Three.js loaded lazily | < 800 KB gzipped |
| Search suggestion debounce | 250 ms |
| API request timeout | 15 s |
| Camera fly-to duration | 800 ms |
| WS reconnect max attempts | 10 (exponential backoff) |

## Testing

```bash
npm test          # vitest run — 30 tests across 5 files
npm run test:watch
```

| File | Tests | What's covered |
|------|-------|---------------|
| `lib/graphMerge.test.ts` | 4 | merge, dedup, position preservation, removeNode |
| `lib/colorMap.test.ts` | 5 | known classes, fallback, colours, status opacity |
| `lib/utils.test.ts` | 9 | sysId validation, format helpers, status labels |
| `store/graphStore.test.ts` | 7 | state transitions, filters, computed values |
| `store/uiStore.test.ts` | 5 | panel toggles, theme, layout mode |

## Extending

### Add a new CI class
1. Add an entry to `CI_CLASS_CONFIG` in `src/lib/colorMap.ts`
2. Add a `case` to the `switch` in `GraphCanvas.tsx` → `nodeThreeObject`

### Add a keyboard shortcut
1. Add to `SHORTCUTS` in `src/components/ui/KeyboardHelp.tsx`
2. Add the handler in `src/hooks/useKeyboardNav.ts`

### Add a new filter dimension
1. Add the field to `GraphFilters` in `src/store/graphStore.ts`
2. Update `useGraphFilters.ts` to apply it
3. Add a control component in `src/components/controls/`
