import type { NodeConfig } from "@/types";

/**
 * CI class → visual config for 3D node rendering.
 * Colors are from a perceptually distinct palette for dark backgrounds.
 */
export const CI_CLASS_CONFIG: Record<string, NodeConfig> = {
  Server: { shape: "box", color: "#68d1f4", size: 8, glowIntensity: 0.34 },
  "Virtual Machine": { shape: "sphere", color: "#8fd08d", size: 7, glowIntensity: 0.28 },
  Database: { shape: "cylinder", color: "#ffc872", size: 8, glowIntensity: 0.4 },
  Application: { shape: "dodecahedron", color: "#d7a6df", size: 9, glowIntensity: 0.44 },
  Service: { shape: "icosahedron", color: "#f06292", size: 10, glowIntensity: 0.62 },
  "Load Balancer": { shape: "torus", color: "#69d9e7", size: 8, glowIntensity: 0.34 },
  Network: { shape: "octahedron", color: "#bfd98a", size: 8, glowIntensity: 0.28 },
  Firewall: { shape: "cone", color: "#ef5350", size: 8, glowIntensity: 0.52 },
  Router: { shape: "octahedron", color: "#39b6a7", size: 8, glowIntensity: 0.28 },
  Switch: { shape: "octahedron", color: "#7ac57a", size: 7, glowIntensity: 0.28 },
  Storage: { shape: "cylinder", color: "#ffb75a", size: 8, glowIntensity: 0.32 },
  Container: { shape: "sphere", color: "#63b9f7", size: 6, glowIntensity: 0.26 },
  Kubernetes: { shape: "icosahedron", color: "#7e57c2", size: 9, glowIntensity: 0.52 },
  "Kubernetes Cluster": { shape: "icosahedron", color: "#7e57c2", size: 9, glowIntensity: 0.52 },
  "Business Service": { shape: "dodecahedron", color: "#ec407a", size: 10, glowIntensity: 0.72 },
  Cluster: { shape: "icosahedron", color: "#ab47bc", size: 8, glowIntensity: 0.52 },
  Cloud: { shape: "torus", color: "#5c9dff", size: 8, glowIntensity: 0.3 },
  Endpoint: { shape: "sphere", color: "#9aa6b2", size: 7, glowIntensity: 0.22 },
  Other: { shape: "sphere", color: "#90a4ae", size: 7, glowIntensity: 0.22 },
};

const FALLBACK_CONFIG: NodeConfig = {
  shape: "sphere",
  color: "#90A4AE",
  size: 7,
  glowIntensity: 0.22,
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
