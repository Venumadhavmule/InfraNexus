import type { NodeConfig } from "@/types";

/**
 * CI class → visual config for 3D node rendering.
 * Colors are from a perceptually distinct palette for dark backgrounds.
 */
export const CI_CLASS_CONFIG: Record<string, NodeConfig> = {
  Server:       { shape: "box",          color: "#4FC3F7", size: 6, glowIntensity: 0.4 },
  "Virtual Machine": { shape: "sphere",  color: "#81C784", size: 5, glowIntensity: 0.3 },
  Database:     { shape: "cylinder",     color: "#FFB74D", size: 6, glowIntensity: 0.5 },
  Application:  { shape: "dodecahedron", color: "#CE93D8", size: 7, glowIntensity: 0.6 },
  Service:      { shape: "icosahedron",  color: "#F06292", size: 7, glowIntensity: 0.6 },
  "Load Balancer": { shape: "torus",     color: "#4DD0E1", size: 5, glowIntensity: 0.4 },
  Network:      { shape: "octahedron",   color: "#AED581", size: 5, glowIntensity: 0.3 },
  Firewall:     { shape: "cone",         color: "#EF5350", size: 5, glowIntensity: 0.5 },
  Router:       { shape: "octahedron",   color: "#26A69A", size: 5, glowIntensity: 0.3 },
  Switch:       { shape: "octahedron",   color: "#66BB6A", size: 4, glowIntensity: 0.3 },
  Storage:      { shape: "cylinder",     color: "#FFA726", size: 6, glowIntensity: 0.4 },
  Container:    { shape: "sphere",       color: "#42A5F5", size: 4, glowIntensity: 0.3 },
  "Kubernetes Cluster": { shape: "icosahedron", color: "#7E57C2", size: 7, glowIntensity: 0.5 },
  "Business Service": { shape: "dodecahedron", color: "#EC407A", size: 8, glowIntensity: 0.7 },
  Cluster:      { shape: "icosahedron",  color: "#AB47BC", size: 6, glowIntensity: 0.5 },
};

const FALLBACK_CONFIG: NodeConfig = {
  shape: "sphere",
  color: "#90A4AE",
  size: 4,
  glowIntensity: 0.2,
};

export function getNodeConfig(ciClass: string): NodeConfig {
  return CI_CLASS_CONFIG[ciClass] ?? FALLBACK_CONFIG;
}

export function getNodeColor(ciClass: string): string {
  return (CI_CLASS_CONFIG[ciClass] ?? FALLBACK_CONFIG).color;
}

/**
 * Returns opacity based on operational_status.
 * 1=Operational (full), 2=Non-Op (dim), 3=Repair (dim+), 4=Retired (very dim)
 */
export function getStatusOpacity(status: number): number {
  switch (status) {
    case 1: return 1.0;
    case 2: return 0.5;
    case 3: return 0.6;
    case 4: return 0.25;
    default: return 0.8;
  }
}
