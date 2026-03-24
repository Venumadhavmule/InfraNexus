// Graph data types — matches backend app/models/graph.py exactly

export interface GraphNode {
  id: string; // sys_id (32 hex chars)
  name: string;
  ci_class: string; // Normalized label: "Server", "Database", etc.
  ci_class_raw: string; // Original sys_class_name
  environment: string;
  operational_status: number; // 1=Operational, 2=Non-Op, 3=Repair, 4=Retired
  degree: number;
  cluster_id: number;
  x?: number;
  y?: number;
  z?: number;
  // Internal force-sim velocity (set by d3-force-3d at runtime)
  vx?: number;
  vy?: number;
  vz?: number;
  // Internal force-sim fixed positions
  fx?: number;
  fy?: number;
  fz?: number;
}

export interface GraphLink {
  source: string | GraphNode; // sys_id or resolved node ref
  target: string | GraphNode;
  rel_type: string; // "Runs on", "Depends on", etc.
  rel_type_reverse: string;
}

export interface NeighborhoodResponse {
  nodes: GraphNode[];
  edges: GraphLink[];
  center_id: string;
  total_in_neighborhood: number;
  truncated: boolean;
  query_time_ms: number;
  cached: boolean;
}

export interface PathStep {
  path: string[]; // list of sys_ids
  length: number;
  edge_types: string[];
}

export interface PathResponse {
  paths: PathStep[];
  source_id: string;
  target_id: string;
  exists: boolean;
  query_time_ms: number;
  cached: boolean;
}

export interface ClassCount {
  ci_class: string;
  count: number;
}

export interface TypeCount {
  rel_type: string;
  count: number;
}

export interface EnvCount {
  environment: string;
  count: number;
}

export interface CISample {
  sys_id: string;
  name: string;
  ci_class: string;
}

export interface ClusterSummary {
  cluster_id: number;
  size: number;
  label: string;
  top_ci_classes: ClassCount[];
  sample_cis: CISample[];
}

export interface ClustersResponse {
  clusters: ClusterSummary[];
  total_clusters: number;
  query_time_ms: number;
  cached: boolean;
}

export interface GraphStatsResponse {
  total_nodes: number;
  total_edges: number;
  avg_degree: number;
  max_degree: number;
  ci_class_distribution: ClassCount[];
  rel_type_distribution: TypeCount[];
  env_distribution: EnvCount[];
  query_time_ms: number;
  cached: boolean;
}

export interface NeighborhoodOptions {
  hops?: 1 | 2 | 3;
  maxNodes?: number;
  degreeThreshold?: number;
  classFilter?: string[];
  envFilter?: string[];
}

export interface NodeConfig {
  shape: "sphere" | "box" | "octahedron" | "cylinder" | "cone" | "torus" | "dodecahedron" | "icosahedron";
  color: string;
  size: number;
  glowIntensity: number;
}

export interface EdgeStyle {
  color: string;
  dashed: boolean;
  width: number;
}
