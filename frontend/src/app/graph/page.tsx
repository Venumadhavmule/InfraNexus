"use client";

import { useEffect } from "react";
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

  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      try {
        const status = await fetchETLStatus();
        if (!cancelled) {
          setFromStatus(status);
        }
      } catch {
        // Ignore ETL status bootstrap errors.
      }
    };

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, [setFromStatus]);

  useEffect(() => {
    let cancelled = false;

    const tryLoadStarterScene = async () => {
      if (nodeCount > 0 || loading) {
        return;
      }

      try {
        const status = await fetchETLStatus();
        const stats = await fetchGraphStats();
        if (cancelled) {
          return;
        }

        setFromStatus(status);

        if (stats.total_nodes > 0) {
          await loadStarterScene();
          return;
        }

        if (status.status === "idle") {
          const response = await triggerSync("full");
          if (!cancelled) {
            handleWSEvent({
              type: "sync_started",
              sync_id: response.sync_id,
              sync_type: response.type,
            });
          }
        }
      } catch {
        // Keep the page usable even if stats or starter-scene load fails.
      }
    };

    void tryLoadStarterScene();

    return () => {
      cancelled = true;
    };
  }, [nodeCount, loading, etlStatus, lastSyncTimestamp, loadStarterScene, setFromStatus, handleWSEvent]);

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
          variant="ghost"
          size="sm"
          onClick={toggleLeftPanel}
          className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
          aria-label="Toggle left panel"
        >
          {leftPanelOpen ? "‹" : "›"}
        </Button>
      </div>
      <div className="absolute right-2 top-1/2 z-20 -translate-y-1/2">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleRightPanel}
          className="h-8 w-8 p-0 opacity-60 hover:opacity-100"
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
