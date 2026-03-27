import type { NodeConfig } from "@/types";

/**
 * CI class → visual config for 3D node rendering.
 * Colors are from a perceptually distinct palette for dark backgrounds.
 */
export const CI_CLASS_CONFIG: Record<string, NodeConfig> = {
  Server:       { shape: "box",          color: "#68d1f4", size: 6, glowIntensity: 0.32 },
  "Virtual Machine": { shape: "sphere",  color: "#8fd08d", size: 5, glowIntensity: 0.26 },
  Database:     { shape: "cylinder",     color: "#ffc872", size: 6, glowIntensity: 0.38 },
  Application:  { shape: "dodecahedron", color: "#d7a6df", size: 7, glowIntensity: 0.42 },
  Service:      { shape: "icosahedron",  color: "#F06292", size: 7, glowIntensity: 0.6 },
  "Load Balancer": { shape: "torus",     color: "#69d9e7", size: 5, glowIntensity: 0.32 },
  Network:      { shape: "octahedron",   color: "#bfd98a", size: 5, glowIntensity: 0.26 },
  Firewall:     { shape: "cone",         color: "#EF5350", size: 5, glowIntensity: 0.5 },
  Router:       { shape: "octahedron",   color: "#39b6a7", size: 5, glowIntensity: 0.26 },
  Switch:       { shape: "octahedron",   color: "#7ac57a", size: 4, glowIntensity: 0.26 },
  Storage:      { shape: "cylinder",     color: "#ffb75a", size: 6, glowIntensity: 0.3 },
  Container:    { shape: "sphere",       color: "#63b9f7", size: 4, glowIntensity: 0.24 },
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
    case 4: return 0.35;
    default: return 0.8;
  }
}
