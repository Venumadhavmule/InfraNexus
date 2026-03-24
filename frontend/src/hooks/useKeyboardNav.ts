"use client";

import { useEffect, useCallback } from "react";
import { useUIStore } from "@/store/uiStore";
import { useGraphStore } from "@/store/graphStore";

/**
 * Global keyboard shortcuts.
 * /         → Focus search
 * Escape    → Close search / deselect node
 * 1, 2, 3   → Set hop depth
 * R         → Reset camera (calls provided callback)
 * F         → Zoom to fit
 * L         → Toggle labels
 * M         → Toggle minimap
 * D         → Toggle dark mode
 * [         → Toggle left panel
 * ]         → Toggle right panel
 * ?         → Toggle keyboard help
 */
export function useKeyboardNav(callbacks?: {
  onResetCamera?: () => void;
  onZoomToFit?: () => void;
  onFocusSearch?: () => void;
}) {
  const toggleLabels = useUIStore((s) => s.toggleLabels);
  const toggleMinimap = useUIStore((s) => s.toggleMinimap);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setHelpOpen = useUIStore((s) => s.setHelpOpen);
  const helpOpen = useUIStore((s) => s.helpOpen);
  const searchOpen = useUIStore((s) => s.searchOpen);

  const selectNode = useGraphStore((s) => s.selectNode);
  const setHops = useGraphStore((s) => s.setHops);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when inside input elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        if (e.key === "Escape") {
          (target as HTMLInputElement).blur();
          setSearchOpen(false);
        }
        return;
      }

      switch (e.key) {
        case "/":
          e.preventDefault();
          setSearchOpen(true);
          callbacks?.onFocusSearch?.();
          break;
        case "Escape":
          if (searchOpen) {
            setSearchOpen(false);
          } else if (helpOpen) {
            setHelpOpen(false);
          } else {
            selectNode(null);
          }
          break;
        case "1":
          setHops(1);
          break;
        case "2":
          setHops(2);
          break;
        case "3":
          setHops(3);
          break;
        case "r":
        case "R":
          callbacks?.onResetCamera?.();
          break;
        case "f":
        case "F":
          callbacks?.onZoomToFit?.();
          break;
        case "l":
        case "L":
          toggleLabels();
          break;
        case "m":
        case "M":
          toggleMinimap();
          break;
        case "d":
        case "D":
          toggleTheme();
          break;
        case "[":
          toggleLeftPanel();
          break;
        case "]":
          toggleRightPanel();
          break;
        case "?":
          setHelpOpen(!helpOpen);
          break;
      }
    },
    [
      callbacks,
      toggleLabels,
      toggleMinimap,
      toggleTheme,
      toggleLeftPanel,
      toggleRightPanel,
      setSearchOpen,
      setHelpOpen,
      helpOpen,
      searchOpen,
      selectNode,
      setHops,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
