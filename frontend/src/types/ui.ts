export type LayoutMode = "force3d" | "dagre" | "radial";
export type ThemeMode = "dark" | "light";
export type HopDepth = 1 | 2 | 3;

export interface PanelState {
  leftOpen: boolean;
  rightOpen: boolean;
}
