# InfraNexus - Frontend Architecture Plan

> **Version**: 1.0 | **Author**: InfraNexus Architecture Team | **Stack**: Next.js 15 + React 19 + Three.js + Zustand + shadcn/ui

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Decisions & Rationale](#3-technology-decisions--rationale)
4. [3D Graph Visualization Engine](#4-3d-graph-visualization-engine)
5. [State Management Architecture](#5-state-management-architecture)
6. [Component Architecture](#6-component-architecture)
7. [Data Flow & API Integration](#7-data-flow--api-integration)
8. [Search & Discovery UX](#8-search--discovery-ux)
9. [Performance Engineering](#9-performance-engineering)
10. [Interaction Design](#10-interaction-design)
11. [Theme & Visual Design System](#11-theme--visual-design-system)
12. [Offline & Progressive Enhancement](#12-offline--progressive-enhancement)
13. [Accessibility](#13-accessibility)
14. [Testing Strategy](#14-testing-strategy)
15. [Implementation Phases](#15-implementation-phases)

---

## 1. Executive Summary

The InfraNexus frontend is a **Next.js application** that renders ServiceNow CMDB infrastructure as an interactive **3D force-directed graph** in the browser using WebGL. Inspired by [GitNexus](https://gitnexus.vercel.app), it provides an immersive way to explore CI relationships, search infrastructure, and understand dependencies.

### Core UX Principles

1. **Graph-first**: The 3D graph IS the application - everything else serves it
2. **Progressive disclosure**: Start with a single CI, expand outward by clicking
3. **Never overwhelm**: Max ~500 visible nodes, always subgraph, always filterable
4. **Instant feedback**: Search < 50ms, click-to-expand < 200ms (perceived)
5. **Keyboard-native**: Power users navigate entirely via keyboard

### Non-Negotiable Requirements

| Requirement | Target |
|-------------|--------|
| First meaningful paint | < 2 seconds |
| Visible nodes limit | 500 default, 2000 max |
| Frame rate (60fps) | Up to 500 nodes |
| Frame rate (30fps viable) | Up to 2000 nodes |
| Search-to-render | < 300ms total |
| Bundle size (initial) | < 500 KB gzipped |
| Offline capability | Last loaded subgraph |

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER                                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Next.js App Shell                      │    │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │    │
│  │  │ Search   │  │  3D Graph    │  │   Side Panels    │  │    │
│  │  │ Bar      │  │  Canvas      │  │   (Inspector,    │  │    │
│  │  │          │  │  (WebGL)     │  │    Filters,      │  │    │
│  │  │          │  │              │  │    Controls)     │  │    │
│  │  └────┬─────┘  └──────┬───────┘  └───────┬──────────┘  │    │
│  │       │               │                   │              │    │
│  │       ▼               ▼                   ▼              │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │              ZUSTAND STORES                       │   │    │
│  │  │  graphStore (nodes, edges, selection, filters)   │   │    │
│  │  │  uiStore (panels, theme, layout mode)            │   │    │
│  │  │  etlStore (sync status, progress)                │   │    │
│  │  └──────────────────────┬───────────────────────────┘   │    │
│  │                         │                                │    │
│  │                         ▼                                │    │
│  │  ┌──────────────────────────────────────────────────┐   │    │
│  │  │              DATA LAYER                           │   │    │
│  │  │  api.ts (typed fetch client)                     │   │    │
│  │  │  graphMerge.ts (incremental graph updates)       │   │    │
│  │  │  useNeighborhood / useSearch / useCI hooks        │   │    │
│  │  │  WebSocket (ETL real-time updates)               │   │    │
│  │  └──────────────────────┬───────────────────────────┘   │    │
│  └─────────────────────────┼────────────────────────────────┘    │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │  HTTP / WebSocket
                             ▼
                   ┌──────────────────┐
                   │  FastAPI Backend  │
                   │  (port 8000)     │
                   └──────────────────┘
```

### Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| **No Next.js API proxy** | Frontend calls FastAPI directly. Eliminates double-hop latency. CORS configured on backend. |
| **react-force-graph-3d** | Most mature WebGL force-graph library. Ships with Three.js scene management, camera controls, D3 force simulation. |
| **Zustand over Redux** | Minimal boilerplate, built-in subscriptions, works with React 19 concurrent features. |
| **SWR for data fetching** | Stale-while-revalidate pattern perfect for CMDB data that changes slowly. Built-in cache + dedup. |
| **shadcn/ui over Material/Ant** | Copy-paste components, full control, Tailwind-native, tiny bundle impact. |
| **Dynamic imports for graph** | Three.js + force-graph is ~800KB. Must be code-split and lazy-loaded. |

---

## 3. Technology Decisions & Rationale

### 3.1 Core Stack

| Technology | Version | Purpose | Bundle Impact |
|-----------|---------|---------|---------------|
| Next.js | 15.x | App framework, SSR shell, routing | ~90 KB |
| React | 19.x | UI rendering | ~40 KB (incl. in Next) |
| TypeScript | 5.x | Type safety | 0 (compile only) |
| Tailwind CSS | 4.x | Utility-first styling | ~10 KB |
| shadcn/ui | latest | UI primitives (copy-paste) | ~5-15 KB |

### 3.2 Graph Rendering

| Technology | Purpose | Bundle Impact |
|-----------|---------|---------------|
| react-force-graph-3d | 3D force-directed graph | ~50 KB |
| three.js | WebGL rendering engine | ~600 KB (tree-shaken) |
| three-spritetext | Text labels on nodes | ~5 KB |
| d3-force-3d | Force simulation engine | ~30 KB |

**Total graph bundle: ~700 KB** - MUST be dynamically imported.

### 3.3 State & Data

| Technology | Purpose |
|-----------|---------|
| Zustand | Client state (graph, UI, ETL) |
| SWR | Server state (API data fetching + caching) |
| idb-keyval | IndexedDB for offline graph cache |

### 3.4 WebGL Performance Limits

Based on benchmarking react-force-graph-3d:

| Node Count | Edge Count | FPS (M1 Mac) | FPS (Budget GPU) | Verdict |
|-----------|-----------|---------------|-------------------|---------|
| 100 | 300 | 60 | 60 | Smooth |
| 500 | 1500 | 60 | 45 | Good |
| 1000 | 3000 | 45 | 30 | Acceptable |
| 2000 | 6000 | 30 | 15 | Degraded |
| 5000 | 15000 | 15 | <10 | Unusable |

**Conclusion**: Frontend MUST enforce a 500-node default limit, 2000 absolute max. Server always sends subgraphs.

---

## 4. 3D Graph Visualization Engine

### 4.1 Component Hierarchy

```
<CMDBGraph>                          # Root wrapper, handles loading states
  ├── <GraphCanvas>                  # ForceGraph3D instance + configuration
  │     ├── nodeThreeObject()        # Custom THREE.js mesh per node
  │     ├── linkThreeObject()        # Custom line/arrow per edge
  │     ├── onNodeClick()            # Select CI, fetch details
  │     ├── onNodeRightClick()       # Expand neighborhood
  │     └── onBackgroundClick()      # Deselect
  ├── <MiniMap>                      # 2D bird's-eye overview  
  └── <GraphStats>                   # Node/edge count badges
```

### 4.2 Node Rendering

Each CI is rendered as a 3D mesh. Type determines shape, status determines color:

```typescript
// NodeObject.tsx - Factory for Three.js node meshes
import * as THREE from 'three';
import SpriteText from 'three-spritetext';

interface NodeConfig {
  shape: 'sphere' | 'box' | 'octahedron' | 'cylinder' | 'torus';
  color: string;
  size: number;
  glowIntensity: number;
}

const CI_CLASS_CONFIG: Record<string, NodeConfig> = {
  'Server':         { shape: 'box',         color: '#4F46E5', size: 6, glowIntensity: 0.3 },
  'Virtual Machine':{ shape: 'sphere',      color: '#7C3AED', size: 5, glowIntensity: 0.2 },
  'Database':       { shape: 'cylinder',    color: '#059669', size: 7, glowIntensity: 0.4 },
  'Application':    { shape: 'octahedron',  color: '#D97706', size: 6, glowIntensity: 0.3 },
  'Service':        { shape: 'torus',       color: '#DC2626', size: 8, glowIntensity: 0.5 },
  'Load Balancer':  { shape: 'sphere',      color: '#0891B2', size: 6, glowIntensity: 0.3 },
  'Network':        { shape: 'octahedron',  color: '#65A30D', size: 5, glowIntensity: 0.2 },
  'Firewall':       { shape: 'box',         color: '#E11D48', size: 5, glowIntensity: 0.3 },
  'Storage':        { shape: 'cylinder',    color: '#9333EA', size: 6, glowIntensity: 0.2 },
  'Kubernetes':     { shape: 'octahedron',  color: '#326CE5', size: 7, glowIntensity: 0.4 },
  'Container':      { shape: 'box',         color: '#2496ED', size: 4, glowIntensity: 0.1 },
  'Cluster':        { shape: 'torus',       color: '#F59E0B', size: 7, glowIntensity: 0.4 },
  'Other':          { shape: 'sphere',      color: '#6B7280', size: 4, glowIntensity: 0.1 },
};

export function createNodeMesh(node: GraphNode): THREE.Object3D {
  const config = CI_CLASS_CONFIG[node.ci_class] || CI_CLASS_CONFIG['Other'];
  
  // Size scales with degree (importance)
  const scaleFactor = 1 + Math.log2(Math.max(node.degree, 1)) * 0.15;
  const size = config.size * scaleFactor;
  
  let geometry: THREE.BufferGeometry;
  switch (config.shape) {
    case 'sphere':      geometry = new THREE.SphereGeometry(size, 16, 12); break;
    case 'box':         geometry = new THREE.BoxGeometry(size, size, size); break;
    case 'octahedron':  geometry = new THREE.OctahedronGeometry(size); break;
    case 'cylinder':    geometry = new THREE.CylinderGeometry(size*0.7, size*0.7, size, 12); break;
    case 'torus':       geometry = new THREE.TorusGeometry(size, size*0.3, 8, 16); break;
  }
  
  // Color by operational status
  const color = node.operational_status === 1 ? config.color : '#6B7280';  // Gray if non-operational
  const material = new THREE.MeshPhongMaterial({
    color,
    emissive: color,
    emissiveIntensity: config.glowIntensity,
    transparent: true,
    opacity: 0.9,
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  
  // Add text label
  const label = new SpriteText(node.name, 3, 'white');
  label.position.y = size + 4;
  label.fontWeight = 'bold';
  label.backgroundColor = 'rgba(0,0,0,0.6)';
  label.padding = 2;
  label.borderRadius = 3;
  mesh.add(label);
  
  return mesh;
}
```

### 4.3 Edge Rendering

```typescript
// EdgeObject.tsx - Relationship visualization
const REL_TYPE_STYLES: Record<string, { color: string; dashed: boolean; width: number }> = {
  'Runs on':        { color: '#818CF8', dashed: false, width: 1.5 },
  'Hosted on':      { color: '#A78BFA', dashed: false, width: 1.5 },
  'Depends on':     { color: '#F87171', dashed: false, width: 2.0 },  // Critical path
  'Contains':       { color: '#60A5FA', dashed: true,  width: 1.0 },
  'Members of':     { color: '#34D399', dashed: true,  width: 1.0 },
  'Connected by':   { color: '#FBBF24', dashed: false, width: 1.0 },
  'Sends data to':  { color: '#F472B6', dashed: false, width: 1.5 },
  'Load balanced by':{ color: '#22D3EE', dashed: false, width: 1.5 },
  'default':        { color: '#9CA3AF', dashed: true,  width: 0.8 },
};

// Directional arrows rendered using Three.js ConeGeometry at edge midpoints
// Arrow direction indicates parent → child flow
```

### 4.4 Camera Control & Animation

```typescript
// useCamera.ts - Camera animation helpers
export function useCamera(graphRef: React.RefObject<ForceGraph3D>) {
  const flyToNode = useCallback((node: GraphNode, distance = 200) => {
    const graph = graphRef.current;
    if (!graph) return;
    
    // Smooth fly-to animation over 1 second
    graph.cameraPosition(
      { x: node.x + distance, y: node.y + distance / 2, z: node.z + distance },  // new position
      { x: node.x, y: node.y, z: node.z },  // lookAt
      1000  // duration ms
    );
  }, [graphRef]);
  
  const resetCamera = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoomToFit(500, 50);  // 500ms animation, 50px padding
  }, [graphRef]);
  
  const orbitCenter = useCallback((centerNode: GraphNode) => {
    // Slow auto-orbit around the center CI
    // Used for idle/demo mode
  }, [graphRef]);
  
  return { flyToNode, resetCamera, orbitCenter };
}
```

### 4.5 Force Simulation Configuration

```typescript
// GraphCanvas.tsx - D3 force simulation tuning
const FORCE_CONFIG = {
  // Charge: negative = repulsion between nodes
  charge: {
    strength: -120,        // Base repulsion
    distanceMax: 500,      // Max influence range
  },
  
  // Link: spring force between connected nodes
  link: {
    distance: (link: GraphLink) => {
      // Shorter links for hierarchical relationships
      if (['Runs on', 'Hosted on', 'Contains'].includes(link.rel_type)) return 40;
      if (['Depends on', 'Uses'].includes(link.rel_type)) return 60;
      return 80;  // Default
    },
    strength: 0.3,
  },
  
  // Center: pull everything toward origin
  center: { strength: 0.05 },
  
  // Collision: prevent node overlap
  collision: { radius: 15, strength: 0.8 },
  
  // Alpha: simulation cooldown
  alphaDecay: 0.02,        // Slow cooldown for smoother animation
  alphaMin: 0.001,         // Stop threshold
  velocityDecay: 0.4,      // Damping
  warmupTicks: 100,        // Pre-simulation ticks before rendering
};
```

---

## 5. State Management Architecture

### 5.1 Graph Store (Zustand)

```typescript
// store/graphStore.ts
interface GraphState {
  // Data
  nodes: Map<string, GraphNode>;     // Map for O(1) lookup
  edges: Map<string, GraphLink>;     // Map for dedup on merge
  
  // Selection
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  expandedNodeIds: Set<string>;      // Nodes whose neighborhoods are loaded
  
  // Filters (applied client-side to already-fetched nodes)
  visibleClasses: Set<string>;       // CI classes to show
  visibleRelTypes: Set<string>;      // Relationship types to show
  visibleEnvironments: Set<string>;  // Environments to show
  
  // Derived (computed from filteredNodes)
  filteredNodes: GraphNode[];        // After applying all filters
  filteredEdges: GraphLink[];        // Edges between filtered nodes only
  
  // Actions
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  mergeNeighborhood: (response: GraphResponse) => void;
  resetGraph: () => void;
  toggleClass: (className: string) => void;
  toggleRelType: (relType: string) => void;
  toggleEnvironment: (env: string) => void;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: new Map(),
  edges: new Map(),
  selectedNodeId: null,
  hoveredNodeId: null,
  expandedNodeIds: new Set(),
  visibleClasses: new Set(),   // Empty = show all
  visibleRelTypes: new Set(),
  visibleEnvironments: new Set(),
  
  get filteredNodes() {
    const state = get();
    let nodes = Array.from(state.nodes.values());
    
    if (state.visibleClasses.size > 0) {
      nodes = nodes.filter(n => state.visibleClasses.has(n.ci_class));
    }
    if (state.visibleEnvironments.size > 0) {
      nodes = nodes.filter(n => state.visibleEnvironments.has(n.environment));
    }
    return nodes;
  },
  
  mergeNeighborhood: (response) => set(state => {
    const newNodes = new Map(state.nodes);
    const newEdges = new Map(state.edges);
    
    for (const node of response.nodes) {
      newNodes.set(node.id, node);
    }
    for (const edge of response.edges) {
      const key = `${edge.source}-${edge.target}-${edge.rel_type}`;
      newEdges.set(key, edge);
    }
    
    return {
      nodes: newNodes,
      edges: newEdges,
      expandedNodeIds: new Set([...state.expandedNodeIds, response.center_id]),
    };
  }),
  
  resetGraph: () => set({
    nodes: new Map(),
    edges: new Map(),
    selectedNodeId: null,
    expandedNodeIds: new Set(),
  }),
}));
```

### 5.2 UI Store

```typescript
// store/uiStore.ts
interface UIState {
  // Panels
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  
  // Graph controls
  hopDepth: 1 | 2 | 3;
  layoutMode: 'force3d' | 'dagre' | 'radial';
  maxNodes: number;
  
  // Theme
  theme: 'dark' | 'light';
  
  // Graph rendering options
  showLabels: boolean;
  showEdgeLabels: boolean;
  showMiniMap: boolean;
  particleEffects: boolean;    // Animated particles along edges
  
  // Actions
  setHopDepth: (depth: 1 | 2 | 3) => void;
  setLayoutMode: (mode: string) => void;
  toggleTheme: () => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
}
```

### 5.3 ETL Store

```typescript
// store/etlStore.ts
interface ETLState {
  status: 'idle' | 'syncing' | 'error' | 'complete';
  progress: number;           // 0-100
  lastSync: string | null;    // ISO timestamp
  totalCIs: number;
  totalRelationships: number;
  currentJob: {
    type: 'full' | 'incremental';
    recordsProcessed: number;
    startedAt: string;
  } | null;
  
  // Updated via WebSocket
  setStatus: (status: ETLState['status']) => void;
  setProgress: (progress: number) => void;
  updateFromWS: (event: WSEvent) => void;
}
```

---

## 6. Component Architecture

### 6.1 Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ┌───────────────── Search Bar ──────────────────┐   [ETL ⚡]  │
│  │  🔍 Search CIs...                              │             │
│  └────────────────────────────────────────────────┘             │
├──────────┬──────────────────────────────────────────┬───────────┤
│          │                                          │           │
│  LEFT    │         3D GRAPH CANVAS                  │  RIGHT    │
│  PANEL   │         (WebGL / Three.js)               │  PANEL    │
│          │                                          │           │
│ ┌──────┐ │                                          │ ┌───────┐ │
│ │Legend │ │         ┌──────────┐                     │ │ Zoom  │ │
│ │ 🔵 Srv│ │         │  CI Hub  │──→ neighbors       │ │ [+]   │ │
│ │ 🟣 VM │ │         └──────────┘                     │ │ [-]   │ │
│ │ 🟢 DB │ │                                          │ │ [Fit] │ │
│ │ 🟠 App│ │                                          │ │       │ │
│ └──────┘ │                                          │ │Layout │ │
│          │                                          │ │○ Force│ │
│ ┌──────┐ │         ┌─────────────┐                  │ │○ Dagre│ │
│ │Filter│ │         │  MiniMap    │                  │ │○Radial│ │
│ │☑ Prod│ │         │  (2D)      │                  │ │       │ │
│ │☑ Dev │ │         └─────────────┘                  │ │ Hops  │ │
│ │☐ Test│ │                                          │ │ [1]   │ │
│ └──────┘ │                                          │ │ [2]   │ │
│          │                                          │ │ [3]   │ │
│ ┌──────┐ │                                          │ └───────┘ │
│ │Inspec│ │                                          │           │
│ │tor   │ │          Node: 234  Edges: 567           │           │
│ │      │ │         ┌─────────────────┐              │           │
│ │CI:   │ │         │  GraphStats     │              │           │
│ │prod- │ │         └─────────────────┘              │           │
│ │db-01 │ │                                          │           │
│ └──────┘ │                                          │           │
├──────────┴──────────────────────────────────────────┴───────────┤
│  Status: Last synced 5 min ago | 1,042,337 CIs | 3,891,204 rels│
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Component Responsibility Map

| Component | Responsibility | State Dependencies |
|-----------|---------------|-------------------|
| `CMDBGraph` | Root graph wrapper, loading/error states | graphStore.nodes |
| `GraphCanvas` | ForceGraph3D instance, Three.js scene | graphStore.filteredNodes |
| `NodeObject` | THREE.js mesh factory per CI class | - (pure function) |
| `EdgeObject` | Edge line/arrow rendering | - (pure function) |
| `MiniMap` | 2D canvas overview of graph bounds | graphStore.filteredNodes |
| `GraphStats` | Badge showing node/edge counts | graphStore.nodes.size |
| `SearchBar` | Input + autocomplete dropdown | useSearch hook |
| `SearchResults` | Result list with CI class icons | useSearch hook |
| `SearchFilters` | Faceted filter dropdowns | uiStore, search facets |
| `LeftPanel` | Collapsible sidebar container | uiStore.leftPanelOpen |
| `CIInspector` | Selected CI detail display | graphStore.selectedNodeId |
| `RelationshipList` | Incoming/outgoing edges list | graphStore.selectedNodeId |
| `CITimeline` | Change history log | useCI hook |
| `RightPanel` | Collapsible controls sidebar | uiStore.rightPanelOpen |
| `HopDepthControl` | 1/2/3 hop radio buttons | uiStore.hopDepth |
| `NodeTypeFilter` | CI class toggle checkboxes | graphStore.visibleClasses |
| `EdgeTypeFilter` | Relationship type toggles | graphStore.visibleRelTypes |
| `LayoutSelector` | Layout algorithm selector | uiStore.layoutMode |
| `ThemeToggle` | Dark/light mode switch | uiStore.theme |

### 6.3 Suspense & Loading Strategy

```typescript
// app/graph/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { GraphSkeleton } from '@/components/graph/GraphSkeleton';

// Dynamic import - Three.js is 700KB, must not be in initial bundle
const CMDBGraph = dynamic(() => import('@/components/graph/CMDBGraph'), {
  ssr: false,  // WebGL cannot render server-side
  loading: () => <GraphSkeleton />,
});

export default function GraphPage() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <SearchBar />
      <div className="flex h-[calc(100vh-64px)]">
        <LeftPanel />
        <Suspense fallback={<GraphSkeleton />}>
          <CMDBGraph />
        </Suspense>
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  );
}
```

---

## 7. Data Flow & API Integration

### 7.1 API Client

```typescript
// lib/api.ts - Typed fetch client
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class InfraNexusAPI {
  private async fetch<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    
    const res = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!res.ok) {
      throw new APIError(res.status, await res.text());
    }
    
    return res.json();
  }
  
  // Graph endpoints
  async getNeighborhood(ciId: string, opts: NeighborhoodOptions): Promise<GraphResponse> {
    return this.fetch(`/api/graph/neighborhood/${ciId}`, {
      hops: String(opts.hops),
      max_nodes: String(opts.maxNodes),
      degree_threshold: String(opts.degreeThreshold),
      ...(opts.classFilter && { class_filter: opts.classFilter.join(',') }),
      ...(opts.envFilter && { env_filter: opts.envFilter.join(',') }),
    });
  }
  
  async getShortestPath(source: string, target: string): Promise<PathResponse> {
    return this.fetch(`/api/graph/path/${source}/${target}`);
  }
  
  async getClusters(): Promise<ClusterResponse> {
    return this.fetch('/api/graph/clusters');
  }
  
  // CI endpoints
  async getCI(ciId: string): Promise<CIDetail> {
    return this.fetch(`/api/ci/${ciId}`);
  }
  
  async getCITimeline(ciId: string): Promise<TimelineResponse> {
    return this.fetch(`/api/ci/${ciId}/timeline`);
  }
  
  // Search endpoints
  async search(query: string, filters?: SearchFilters): Promise<SearchResponse> {
    return this.fetch('/api/search', {
      q: query,
      ...(filters?.ciClass && { class: filters.ciClass }),
      ...(filters?.environment && { env: filters.environment }),
    });
  }
  
  async suggest(prefix: string): Promise<SuggestResponse> {
    return this.fetch('/api/search/suggest', { q: prefix });
  }
  
  // ETL endpoints
  async triggerSync(type: 'full' | 'incremental'): Promise<void> {
    await fetch(`${API_BASE}/api/etl/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
  }
  
  async getETLStatus(): Promise<ETLStatus> {
    return this.fetch('/api/etl/status');
  }
}

export const api = new InfraNexusAPI();
```

### 7.2 Graph Merge Logic

The most critical client-side algorithm - merging new neighborhoods into the existing graph WITHOUT duplicates or layout reset:

```typescript
// lib/graphMerge.ts
export function mergeGraphResponse(
  existing: { nodes: Map<string, GraphNode>; edges: Map<string, GraphLink> },
  response: GraphResponse
): { nodes: Map<string, GraphNode>; edges: Map<string, GraphLink>; newNodeIds: Set<string> } {
  const nodes = new Map(existing.nodes);
  const edges = new Map(existing.edges);
  const newNodeIds = new Set<string>();
  
  for (const node of response.nodes) {
    if (!nodes.has(node.id)) {
      newNodeIds.add(node.id);
    }
    // Always update (may have new data from server)
    // BUT preserve existing x/y/z positions to avoid layout jump
    const existing = nodes.get(node.id);
    nodes.set(node.id, {
      ...node,
      x: existing?.x ?? node.x,
      y: existing?.y ?? node.y,
      z: existing?.z ?? node.z,
      // Preserve velocity from force simulation
      vx: existing?.vx ?? 0,
      vy: existing?.vy ?? 0,
      vz: existing?.vz ?? 0,
    });
  }
  
  for (const edge of response.edges) {
    const key = `${edge.source}-${edge.target}-${edge.rel_type}`;
    edges.set(key, edge);
  }
  
  return { nodes, edges, newNodeIds };
}
```

### 7.3 Custom Hooks

```typescript
// hooks/useNeighborhood.ts
export function useNeighborhood() {
  const { mergeNeighborhood, expandedNodeIds } = useGraphStore();
  const { hopDepth, maxNodes } = useUIStore();
  
  const expandNode = useCallback(async (ciId: string) => {
    if (expandedNodeIds.has(ciId)) return;  // Already expanded
    
    const response = await api.getNeighborhood(ciId, {
      hops: hopDepth,
      maxNodes,
      degreeThreshold: 100,
    });
    
    mergeNeighborhood(response);
  }, [hopDepth, maxNodes, expandedNodeIds]);
  
  return { expandNode };
}

// hooks/useSearch.ts
export function useSearch() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 150);
  
  // Autocomplete suggestions (SWR with dedup)
  const { data: suggestions } = useSWR(
    debouncedQuery.length >= 2 ? ['suggest', debouncedQuery] : null,
    () => api.suggest(debouncedQuery),
    { dedupingInterval: 100 }
  );
  
  const navigateToCI = useCallback(async (ciId: string) => {
    // 1. Fetch neighborhood
    const response = await api.getNeighborhood(ciId, { hops: 2, maxNodes: 500 });
    // 2. Reset graph and load new neighborhood
    useGraphStore.getState().resetGraph();
    useGraphStore.getState().mergeNeighborhood(response);
    // 3. Select the searched CI
    useGraphStore.getState().selectNode(ciId);
  }, []);
  
  return { query, setQuery, suggestions, navigateToCI };
}
```

### 7.4 WebSocket for ETL Updates

```typescript
// hooks/useWebSocket.ts
export function useWebSocket() {
  const updateFromWS = useETLStore(s => s.updateFromWS);
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';
  
  useEffect(() => {
    const ws = new WebSocket(`${wsUrl}/ws/etl`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateFromWS(data);
    };
    
    ws.onclose = () => {
      // Reconnect with exponential backoff
      setTimeout(() => reconnect(), 3000);
    };
    
    return () => ws.close();
  }, []);
}
```

---

## 8. Search & Discovery UX

### 8.1 Search Flow

```
User types "prod-db" in SearchBar
       │
       ▼ (debounced 150ms)
  api.suggest("prod-db") → Meilisearch prefix search
       │
       ▼
  Dropdown shows 8 suggestions:
    🟢 prod-db-01 (Database, production)
    🟢 prod-db-02 (Database, production)
    🟢 prod-db-cluster (Cluster, production)
    🔵 prod-db-server-01 (Server, production)
       │
       ▼ (user clicks "prod-db-01")
  1. api.getNeighborhood("abc123", {hops: 2})
  2. Graph resets + loads neighborhood
  3. Camera flies to prod-db-01
  4. prod-db-01 selected (inspector opens)
```

### 8.2 Interaction: Click to Expand

```
User clicks a CI node in the graph
       │
       ├── Left click: SELECT
       │   → Inspector panel shows CI details
       │   → Node highlighted with glow effect
       │   → SWR fetches full CI detail: api.getCI(ciId)
       │
       └── Double click: EXPAND
           → If not already expanded:
             1. api.getNeighborhood(ciId, {hops: hopDepth})
             2. Merge new nodes/edges into existing graph
             3. New nodes animate in from center CI position
             4. Force simulation gently re-equilibrates
           → If already expanded:
             → Toast: "Neighborhood already loaded"
```

---

## 9. Performance Engineering

### 9.1 Bundle Optimization

```typescript
// next.config.mjs
export default {
  experimental: {
    optimizePackageImports: ['three', '@react-three/fiber'],
  },
  webpack: (config) => {
    // Tree-shake Three.js - only import what we use
    config.resolve.alias = {
      ...config.resolve.alias,
      'three': 'three/src/Three.js', // Enable deep tree-shaking
    };
    return config;
  },
};
```

### 9.2 Rendering Optimization

```typescript
// Level-of-Detail (LOD) for graph rendering
function getNodeDetail(cameraDistance: number): 'high' | 'medium' | 'low' {
  if (cameraDistance < 200) return 'high';    // Full mesh + label
  if (cameraDistance < 500) return 'medium';  // Simplified mesh, no label
  return 'low';                               // Point sprite only
}

// Instanced rendering for 500+ nodes
// Instead of individual Mesh per node, use InstancedMesh for nodes of same type
function createInstancedNodes(nodes: GraphNode[]): THREE.InstancedMesh {
  const grouped = groupBy(nodes, n => n.ci_class);
  // One InstancedMesh per CI class - reduces draw calls from N to ~13
}
```

### 9.3 Memory Management

```typescript
// Dispose Three.js objects when nodes are filtered out
function disposeNode(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
  // Remove from scene
}

// Maximum graph size enforcement
const MAX_VISIBLE_NODES = 2000;
function enforceNodeLimit(nodes: GraphNode[]): GraphNode[] {
  if (nodes.length <= MAX_VISIBLE_NODES) return nodes;
  
  // Keep highest-degree nodes + always keep selected + expanded
  return nodes
    .sort((a, b) => b.degree - a.degree)
    .slice(0, MAX_VISIBLE_NODES);
}
```

### 9.4 Initial Load Sequence

```
1. [0ms]    HTML shell loads (SSR from Next.js - instant)
2. [100ms]  Tailwind CSS + layout renders
3. [200ms]  SearchBar + panels render (small JS)
4. [300ms]  GraphSkeleton shows (loading animation)
5. [500ms]  Three.js chunk starts downloading (parallel)
6. [800ms]  API call: /api/graph/clusters (background)
7. [1200ms] Three.js loaded, ForceGraph3D initializing
8. [1500ms] WebGL context ready, scene created
9. [1800ms] User types search OR default view loads
10.[2000ms] First meaningful graph render ✓
```

---

## 10. Interaction Design

### 10.1 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` | Focus search bar |
| `Escape` | Clear selection / close panel / exit search |
| `Enter` | Select first search result |
| `1`, `2`, `3` | Set hop depth |
| `R` | Reset graph (clear all) |
| `F` | Fit graph to view |
| `L` | Toggle labels |
| `M` | Toggle minimap |
| `[` | Toggle left panel |
| `]` | Toggle right panel |
| `D` | Toggle dark/light theme |
| `Arrow keys` | Navigate between connected nodes |
| `Space` | Expand selected node's neighborhood |
| `Delete/Backspace` | Remove selected node from view |

### 10.2 Mouse Interactions

| Action | Behavior |
|--------|----------|
| Left click node | Select → show in inspector |
| Double click node | Expand neighborhood |
| Right click node | Context menu (copy ID, expand, hide, find path) |
| Scroll wheel | Zoom in/out |
| Left drag background | Rotate view |
| Right drag background | Pan view |
| Hover node | Highlight + show tooltip (name, class, env) |
| Hover edge | Show relationship type tooltip |

### 10.3 Touch Interactions (Tablet Support)

| Gesture | Action |
|---------|--------|
| Tap node | Select |
| Double tap node | Expand |
| Long press node | Context menu |
| Pinch | Zoom |
| Single finger drag | Rotate |
| Two finger drag | Pan |

---

## 11. Theme & Visual Design System

### 11.1 Color Palette

```typescript
// lib/colorMap.ts
export const THEME = {
  dark: {
    background: '#0A0A0F',        // Near-black with blue tint
    surface: '#141420',           // Card/panel background
    surfaceHover: '#1E1E30',
    border: '#2A2A40',
    text: '#E2E8F0',
    textMuted: '#94A3B8',
    accent: '#818CF8',            // Indigo
    accentHover: '#6366F1',
    
    // Graph-specific
    graphBackground: '#050510',   // Darkest for immersive feel
    gridColor: '#1A1A2E',
    edgeDefault: '#4B5563',
    nodeGlow: 'rgba(129, 140, 248, 0.3)',
  },
  light: {
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceHover: '#F1F5F9',
    border: '#E2E8F0',
    text: '#1E293B',
    textMuted: '#64748B',
    accent: '#4F46E5',
    accentHover: '#4338CA',
    
    graphBackground: '#F8FAFC',
    gridColor: '#E2E8F0',
    edgeDefault: '#94A3B8',
    nodeGlow: 'rgba(79, 70, 229, 0.2)',
  },
} as const;
```

### 11.2 CI Class Color Palette (Consistent Across Themes)

```typescript
export const CI_COLORS: Record<string, string> = {
  'Server':           '#4F46E5',  // Indigo
  'Virtual Machine':  '#7C3AED',  // Violet
  'Database':         '#059669',  // Emerald
  'Application':      '#D97706',  // Amber
  'Service':          '#DC2626',  // Red
  'Load Balancer':    '#0891B2',  // Cyan
  'Network':          '#65A30D',  // Lime
  'Firewall':         '#E11D48',  // Rose
  'Storage':          '#9333EA',  // Purple
  'Kubernetes':       '#326CE5',  // K8s Blue
  'Container':        '#2496ED',  // Docker Blue
  'Cluster':          '#F59E0B',  // Yellow
  'Endpoint':         '#6366F1',  // Indigo lighter
  'Cloud':            '#0EA5E9',  // Sky
  'Other':            '#6B7280',  // Gray
};
```

---

## 12. Offline & Progressive Enhancement

### 12.1 Offline Strategy

```typescript
// Using idb-keyval for IndexedDB storage
import { get, set } from 'idb-keyval';

const OFFLINE_KEY = 'infranexus:last_graph';

// Save current graph state on every significant change
async function persistGraph(nodes: Map<string, GraphNode>, edges: Map<string, GraphLink>) {
  await set(OFFLINE_KEY, {
    nodes: Array.from(nodes.entries()),
    edges: Array.from(edges.entries()),
    savedAt: new Date().toISOString(),
  });
}

// Restore on app load if backend is unreachable
async function restoreGraph(): Promise<{ nodes: Map<string, GraphNode>; edges: Map<string, GraphLink> } | null> {
  const saved = await get(OFFLINE_KEY);
  if (!saved) return null;
  
  return {
    nodes: new Map(saved.nodes),
    edges: new Map(saved.edges),
  };
}
```

### 12.2 Service Worker (Optional, Phase 2)

- Cache API responses for offline viewing
- Pre-cache search index for offline autocomplete
- Background sync for pending ETL triggers

---

## 13. Accessibility

### 13.1 WCAG 2.1 AA Compliance

- All interactive elements keyboard-reachable
- Color is NEVER the only way to distinguish CI types (shapes are primary)
- High contrast text (4.5:1 ratio minimum)
- `aria-label` on all graph controls
- Screen reader announcements for node selection, search results
- Reduced motion mode: disable animations, use static layout

### 13.2 Graph Accessibility

```typescript
// When a node is selected, announce to screen readers
useEffect(() => {
  if (selectedNodeId) {
    const node = nodes.get(selectedNodeId);
    announce(`Selected ${node.ci_class}: ${node.name}, ${node.environment} environment, 
              ${node.degree} connections`);
  }
}, [selectedNodeId]);
```

---

## 14. Testing Strategy

### 14.1 Test Pyramid

| Layer | Tool | Coverage |
|-------|------|----------|
| Unit tests | Vitest | graphMerge, colorMap, sizeMap, store reducers |
| Component tests | React Testing Library | SearchBar, Inspector, Filters |
| Integration tests | Playwright | Full search → graph flow |
| Visual regression | Chromatic (optional) | Component snapshots |
| Performance tests | Lighthouse CI | Bundle size, LCP, FID |

### 14.2 Critical Test Scenarios

1. **Graph merge**: Adding a neighborhood doesn't duplicate nodes
2. **Filter toggle**: Hiding a CI class removes nodes AND their orphan edges
3. **Search → navigate**: Searching and clicking result loads correct graph
4. **Super-node guard**: Expanding a high-degree node stays under max_nodes
5. **Offline restore**: Graph loads from IndexedDB when backend unavailable
6. **Theme switch**: All colors update, no flash of unstyled content

---

## 15. Implementation Phases

### Phase 1: Shell & Search (Week 1)
- [ ] Next.js project setup with Tailwind + shadcn/ui
- [ ] Page layout (search bar, left/right panels, main area)
- [ ] Zustand stores (graph, UI, ETL)
- [ ] API client (api.ts)
- [ ] SearchBar with autocomplete (connected to Meilisearch)
- [ ] GraphSkeleton loading state
- [ ] Dark/light theme toggle

### Phase 2: 3D Graph Core (Week 2)
- [ ] ForceGraph3D integration (dynamic import)
- [ ] Custom node rendering (NodeObject.tsx)
- [ ] Custom edge rendering (EdgeObject.tsx)
- [ ] Node click → select (inspector opens)
- [ ] Node double-click → expand neighborhood
- [ ] Camera fly-to animation
- [ ] Force simulation tuning
- [ ] Graph stats badge

### Phase 3: Panels & Controls (Week 3)
- [ ] CI Inspector panel (full details)
- [ ] Relationship list (incoming/outgoing)
- [ ] Node type filter (toggle CI classes)
- [ ] Edge type filter (toggle relationship types)
- [ ] Environment filter
- [ ] Hop depth control (1/2/3)
- [ ] Layout selector (force3d, dagre, radial)
- [ ] Keyboard shortcuts

### Phase 4: Advanced Visualization (Week 4)
- [ ] MiniMap (2D overview)
- [ ] Cluster view (top-level bubbles)
- [ ] Shortest path visualization
- [ ] Node size scaling by degree
- [ ] Edge direction arrows
- [ ] Edge particles (animated flow)
- [ ] Level-of-detail rendering
- [ ] Instanced rendering optimization

### Phase 5: Polish & Offline (Week 5)
- [ ] CI Timeline panel
- [ ] WebSocket ETL status bar
- [ ] Offline mode (IndexedDB persistence)
- [ ] Context menu (right-click)
- [ ] Responsive design (tablet-friendly)
- [ ] Performance audit (Lighthouse)
- [ ] Accessibility audit

---

*This document is the single source of truth for frontend architecture decisions. All implementation must follow this plan.*
