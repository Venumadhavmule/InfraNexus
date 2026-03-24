import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutMode, ThemeMode, HopDepth } from "@/types";

interface UIState {
  // ── Panels ───────────────────────────────────────────────
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // ── Theme ────────────────────────────────────────────────
  theme: ThemeMode;

  // ── Graph Controls ───────────────────────────────────────
  layoutMode: LayoutMode;
  showLabels: boolean;
  showMinimap: boolean;
  showParticles: boolean;

  // ── Search ───────────────────────────────────────────────
  searchOpen: boolean;

  // ── Keyboard Help ────────────────────────────────────────
  helpOpen: boolean;

  // ── Actions ──────────────────────────────────────────────
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanel: (open: boolean) => void;
  setRightPanel: (open: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLayoutMode: (mode: LayoutMode) => void;
  toggleLabels: () => void;
  toggleMinimap: () => void;
  toggleParticles: () => void;
  setSearchOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      leftPanelOpen: true,
      rightPanelOpen: false,
      theme: "dark",
      layoutMode: "force3d",
      showLabels: true,
      showMinimap: false,
      showParticles: true,
      searchOpen: false,
      helpOpen: false,

      toggleLeftPanel: () => set((s) => ({ leftPanelOpen: !s.leftPanelOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setLeftPanel: (open) => set({ leftPanelOpen: open }),
      setRightPanel: (open) => set({ rightPanelOpen: open }),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setLayoutMode: (mode) => set({ layoutMode: mode }),
      toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
      toggleMinimap: () => set((s) => ({ showMinimap: !s.showMinimap })),
      toggleParticles: () => set((s) => ({ showParticles: !s.showParticles })),
      setSearchOpen: (open) => set({ searchOpen: open }),
      setHelpOpen: (open) => set({ helpOpen: open }),
    }),
    {
      name: "infranexus-ui",
      partialize: (state) => ({
        theme: state.theme,
        layoutMode: state.layoutMode,
        showLabels: state.showLabels,
        showMinimap: state.showMinimap,
        showParticles: state.showParticles,
        leftPanelOpen: state.leftPanelOpen,
      }),
    },
  ),
);
