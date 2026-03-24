import { create } from "zustand";
import type { GraphNode, GraphLink, NeighborhoodOptions } from "@/types";
import { DEFAULT_HOPS, MAX_NODES_DEFAULT } from "@/lib/constants";

export interface GraphFilters {
  ciClasses: Set<string>;
  relTypes: Set<string>;
  environments: Set<string>;
  minDegree: number;
}

interface GraphState {
  // ── Data ─────────────────────────────────────────────────
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphLink>;
  centerId: string | null;
  truncated: boolean;
  totalInNeighborhood: number;
  expandedNodeIds: Set<string>;

  // ── Selection ────────────────────────────────────────────
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  pathHighlight: string[];

  // ── Filters ──────────────────────────────────────────────
  filters: GraphFilters;

  // ── Query Options ────────────────────────────────────────
  hops: 1 | 2 | 3;
  maxNodes: number;

  // ── Loading ──────────────────────────────────────────────
  loading: boolean;
  error: string | null;

  // ── Derived data helpers ─────────────────────────────────
  availableClasses: () => string[];
  availableRelTypes: () => string[];
  availableEnvironments: () => string[];

  // ── Actions ──────────────────────────────────────────────
  setGraph: (nodes: Map<string, GraphNode>, edges: Map<string, GraphLink>, centerId: string, truncated: boolean, total: number) => void;
  mergeGraph: (nodes: Map<string, GraphNode>, edges: Map<string, GraphLink>) => void;
  clearGraph: () => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  markExpanded: (id: string) => void;
  setPathHighlight: (path: string[]) => void;
  clearPathHighlight: () => void;
  setHops: (hops: 1 | 2 | 3) => void;
  setMaxNodes: (max: number) => void;
  toggleClassFilter: (cls: string) => void;
  toggleRelTypeFilter: (rel: string) => void;
  toggleEnvFilter: (env: string) => void;
  setMinDegree: (min: number) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  getNeighborhoodOptions: () => NeighborhoodOptions;
}

const emptyFilters: GraphFilters = {
  ciClasses: new Set(),
  relTypes: new Set(),
  environments: new Set(),
  minDegree: 0,
};

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: new Map(),
  edges: new Map(),
  centerId: null,
  truncated: false,
  totalInNeighborhood: 0,
  expandedNodeIds: new Set(),

  selectedNodeId: null,
  hoveredNodeId: null,
  pathHighlight: [],

  filters: { ...emptyFilters, ciClasses: new Set(), relTypes: new Set(), environments: new Set() },

  hops: DEFAULT_HOPS,
  maxNodes: MAX_NODES_DEFAULT,

  loading: false,
  error: null,

  availableClasses: () => {
    const classes = new Set<string>();
    for (const node of get().nodes.values()) classes.add(node.ci_class);
    return [...classes].sort();
  },

  availableRelTypes: () => {
    const types = new Set<string>();
    for (const edge of get().edges.values()) types.add(edge.rel_type);
    return [...types].sort();
  },

  availableEnvironments: () => {
    const envs = new Set<string>();
    for (const node of get().nodes.values()) {
      if (node.environment) envs.add(node.environment);
    }
    return [...envs].sort();
  },

  setGraph: (nodes, edges, centerId, truncated, total) =>
    set({
      nodes,
      edges,
      centerId,
      truncated,
      totalInNeighborhood: total,
      expandedNodeIds: new Set([centerId]),
      selectedNodeId: centerId,
      error: null,
    }),

  mergeGraph: (newNodes, newEdges) =>
    set((state) => {
      const merged = new Map(state.nodes);
      for (const [id, node] of newNodes) {
        const existing = merged.get(id);
        if (existing) {
          // Preserve force-sim positions
          merged.set(id, { ...node, x: existing.x, y: existing.y, z: existing.z, vx: existing.vx, vy: existing.vy, vz: existing.vz, fx: existing.fx, fy: existing.fy, fz: existing.fz });
        } else {
          merged.set(id, node);
        }
      }
      const mergedEdges = new Map(state.edges);
      for (const [key, edge] of newEdges) {
        mergedEdges.set(key, edge);
      }
      return { nodes: merged, edges: mergedEdges };
    }),

  clearGraph: () =>
    set({
      nodes: new Map(),
      edges: new Map(),
      centerId: null,
      truncated: false,
      totalInNeighborhood: 0,
      expandedNodeIds: new Set(),
      selectedNodeId: null,
      hoveredNodeId: null,
      pathHighlight: [],
      error: null,
    }),

  selectNode: (id) => set({ selectedNodeId: id }),
  hoverNode: (id) => set({ hoveredNodeId: id }),

  markExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedNodeIds);
      next.add(id);
      return { expandedNodeIds: next };
    }),

  setPathHighlight: (path) => set({ pathHighlight: path }),
  clearPathHighlight: () => set({ pathHighlight: [] }),
  setHops: (hops) => set({ hops }),
  setMaxNodes: (max) => set({ maxNodes: max }),

  toggleClassFilter: (cls) =>
    set((state) => {
      const next = new Set(state.filters.ciClasses);
      if (next.has(cls)) next.delete(cls);
      else next.add(cls);
      return { filters: { ...state.filters, ciClasses: next } };
    }),

  toggleRelTypeFilter: (rel) =>
    set((state) => {
      const next = new Set(state.filters.relTypes);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return { filters: { ...state.filters, relTypes: next } };
    }),

  toggleEnvFilter: (env) =>
    set((state) => {
      const next = new Set(state.filters.environments);
      if (next.has(env)) next.delete(env);
      else next.add(env);
      return { filters: { ...state.filters, environments: next } };
    }),

  setMinDegree: (min) =>
    set((state) => ({ filters: { ...state.filters, minDegree: min } })),

  resetFilters: () =>
    set({
      filters: {
        ciClasses: new Set(),
        relTypes: new Set(),
        environments: new Set(),
        minDegree: 0,
      },
    }),

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  getNeighborhoodOptions: () => {
    const { hops, maxNodes, filters } = get();
    return {
      hops,
      maxNodes,
      degreeThreshold: filters.minDegree || undefined,
      classFilter: filters.ciClasses.size > 0 ? [...filters.ciClasses] : undefined,
      envFilter: filters.environments.size > 0 ? [...filters.environments] : undefined,
    };
  },
}));
