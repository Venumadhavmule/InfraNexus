import type { EdgeStyle } from "@/types";

export const REL_TYPE_STYLES: Record<string, EdgeStyle> = {
  "Runs on":        { color: "#4FC3F7", dashed: false, width: 1.5 },
  "Depends on":     { color: "#F06292", dashed: false, width: 2.0 },
  "Contains":       { color: "#81C784", dashed: false, width: 1.5 },
  "Hosted on":      { color: "#FFB74D", dashed: false, width: 1.5 },
  "Connected to":   { color: "#CE93D8", dashed: true,  width: 1.0 },
  "Members of":     { color: "#AED581", dashed: true,  width: 1.0 },
  "Sends data to":  { color: "#4DD0E1", dashed: false, width: 1.5 },
  "Uses":           { color: "#BA68C8", dashed: false, width: 1.5 },
  "Monitors":       { color: "#FFD54F", dashed: true,  width: 1.0 },
  "Provides":       { color: "#A5D6A7", dashed: false, width: 1.5 },
  "Consumes":       { color: "#EF9A9A", dashed: false, width: 1.5 },
  "Cluster of":     { color: "#7E57C2", dashed: true,  width: 1.0 },
};

const FALLBACK_STYLE: EdgeStyle = {
  color: "#607D8B",
  dashed: true,
  width: 1.0,
};

export function getEdgeStyle(relType: string): EdgeStyle {
  return REL_TYPE_STYLES[relType] ?? FALLBACK_STYLE;
}
