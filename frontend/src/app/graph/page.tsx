"use client";

import { useCallback, useEffect, useRef } from "react";
import { CMDBGraph } from "@/components/graph/CMDBGraph";
import { GraphStats } from "@/components/graph/GraphStats";
import { SearchBar } from "@/components/search/SearchBar";
import { LeftPanel } from "@/components/panels/LeftPanel";
import { RightPanel } from "@/components/panels/RightPanel";
import { StatusBar } from "@/components/ui/StatusBar";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useNeighborhood } from "@/hooks/useNeighborhood";
import { fetchETLStatus, fetchGraphStats, triggerSync } from "@/lib/api";
import { useGraphStore } from "@/store/graphStore";
import { useUIStore } from "@/store/uiStore";
import { useETLStore } from "@/store/etlStore";
import { Button } from "@/components/ui/button";

export default function GraphPage() {
  // Initialize dark mode class sync
  useDarkMode();
  // Connect ETL WebSocket
  useWebSocket();

  const { loadStarterScene } = useNeighborhood();
  const nodeCount = useGraphStore((s) => s.nodes.size);
  const loading = useGraphStore((s) => s.loading);
  const etlStatus = useETLStore((s) => s.status);
  const lastSyncTimestamp = useETLStore((s) => s.lastSyncTimestamp);
  const setFromStatus = useETLStore((s) => s.setFromStatus);
  const handleWSEvent = useETLStore((s) => s.handleWSEvent);
  const autoSyncRequestedRef = useRef(false);
  const loadStarterSceneRef = useRef(loadStarterScene);
  const setFromStatusRef = useRef(setFromStatus);
  const handleWSEventRef = useRef(handleWSEvent);

  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  useEffect(() => {
    loadStarterSceneRef.current = loadStarterScene;
    setFromStatusRef.current = setFromStatus;
    handleWSEventRef.current = handleWSEvent;
  }, [handleWSEvent, loadStarterScene, setFromStatus]);

  const loadStarterSceneIfAvailable = useCallback(async () => {
    const stats = await fetchGraphStats();
    if (stats.total_nodes <= 0) {
      return false;
    }

    await loadStarterSceneRef.current();
    return true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapGraph = async () => {
      try {
        const [status, graphLoaded] = await Promise.all([
          fetchETLStatus(),
          nodeCount === 0 && !loading ? loadStarterSceneIfAvailable() : Promise.resolve(false),
        ]);

        if (!cancelled) {
          setFromStatusRef.current(status);
          if (graphLoaded || nodeCount > 0) {
            return;
          }

          if (status.status === "idle" && !autoSyncRequestedRef.current) {
            autoSyncRequestedRef.current = true;
            const response = await triggerSync("full");
            if (!cancelled) {
              handleWSEventRef.current({
                type: "sync_started",
                sync_id: response.sync_id,
                sync_type: response.type,
              });
            }
          }
        }
      } catch {
        // Keep the page usable even if bootstrap checks fail.
      }
    };

    void bootstrapGraph();

    return () => {
      cancelled = true;
    };
  }, [loadStarterSceneIfAvailable, loading, nodeCount]);

  useEffect(() => {
    let cancelled = false;

    const finalizeBootstrap = async () => {
      if (nodeCount > 0 || loading || etlStatus !== "idle") {
        return;
      }

      try {
        const [status, graphLoaded] = await Promise.all([
          fetchETLStatus(),
          loadStarterSceneIfAvailable(),
        ]);
        if (cancelled) {
          return;
        }

        setFromStatusRef.current(status);
        if (graphLoaded) {
          autoSyncRequestedRef.current = false;
        }
      } catch {
        // Keep the page usable even if post-sync graph load fails.
      }
    };

    void finalizeBootstrap();

    return () => {
      cancelled = true;
    };
  }, [etlStatus, lastSyncTimestamp, loadStarterSceneIfAvailable, loading, nodeCount]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Search overlay */}
      <SearchBar />

      {/* Side panels */}
      <LeftPanel />
      <RightPanel />

      {/* Graph stats badge */}
      <GraphStats />

      {/* Panel toggle buttons */}
      <div className="absolute left-2 top-1/2 z-20 -translate-y-1/2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLeftPanel}
          className="h-9 w-9 border-border/70 bg-background/90 p-0 text-foreground shadow-md transition hover:bg-background"
          aria-label="Toggle left panel"
        >
          {leftPanelOpen ? "‹" : "›"}
        </Button>
      </div>
      <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleRightPanel}
          className="h-10 w-10 border-primary/50 bg-background/95 p-0 text-primary shadow-lg ring-1 ring-primary/20 transition hover:bg-primary/10"
          aria-label="Toggle right panel"
        >
          {rightPanelOpen ? "›" : "‹"}
        </Button>
      </div>

      {/* Search trigger button */}
      <div className="absolute right-4 top-4 z-20">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="gap-2 text-xs text-muted-foreground"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Search
          <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">/</kbd>
        </Button>
      </div>

      {/* 3D Graph (fills remaining space) */}
      <CMDBGraph />

      {/* Status bar */}
      <StatusBar />
    </div>
  );
}
