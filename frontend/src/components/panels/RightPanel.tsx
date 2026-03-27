"use client";

import { useState } from "react";
import { useUIStore } from "@/store/uiStore";
import { useETLStore } from "@/store/etlStore";
import { HopDepthControl } from "@/components/controls/HopDepthControl";
import { NodeTypeFilter } from "@/components/controls/NodeTypeFilter";
import { EdgeTypeFilter } from "@/components/controls/EdgeTypeFilter";
import { LayoutSelector } from "@/components/controls/LayoutSelector";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { triggerSync } from "@/lib/api";
import { cn } from "@/lib/utils";

export function RightPanel() {
  const open = useUIStore((s) => s.rightPanelOpen);
  const setRightPanel = useUIStore((s) => s.setRightPanel);
  const showLabels = useUIStore((s) => s.showLabels);
  const showParticles = useUIStore((s) => s.showParticles);
  const toggleLabels = useUIStore((s) => s.toggleLabels);
  const toggleParticles = useUIStore((s) => s.toggleParticles);
  const etlStatus = useETLStore((s) => s.status);
  const handleWSEvent = useETLStore((s) => s.handleWSEvent);
  const [syncLoading, setSyncLoading] = useState<"full" | "incremental" | null>(null);

  const startSync = async (type: "full" | "incremental") => {
    if (etlStatus === "running") return;
    setSyncLoading(type);
    try {
      const response = await triggerSync(type);
      handleWSEvent({
        type: "sync_started",
        sync_id: response.sync_id,
        sync_type: response.type,
      });
    } catch {
      handleWSEvent({
        type: "sync_error",
        error: `Failed to start ${type} sync`,
      });
    } finally {
      setSyncLoading(null);
    }
  };

  return (
    <div
      className={cn(
        "fixed right-0 top-0 z-30 h-full w-72 border-l border-border/40 bg-background/95 backdrop-blur-sm transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-primary/15 bg-primary/5 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Controls</h2>
            <p className="text-[11px] text-muted-foreground">Sync, filters, and graph display</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setRightPanel(false)}
              aria-label="Close controls panel"
            >
              ×
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            <div className="space-y-3 rounded-lg border border-primary/15 bg-primary/5 p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Sync</h3>
                <span className="text-[11px] text-muted-foreground">
                  {etlStatus === "running" ? "In progress" : "Ready"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startSync("incremental")}
                  disabled={etlStatus === "running" || syncLoading !== null}
                >
                  {syncLoading === "incremental" ? "Syncing..." : "Sync Latest"}
                </Button>
                <Button
                  size="sm"
                  className="font-semibold shadow-sm"
                  onClick={() => startSync("full")}
                  disabled={etlStatus === "running" || syncLoading !== null}
                >
                  {syncLoading === "full" ? "Reloading..." : "Full Reload"}
                </Button>
              </div>
            </div>

            <Separator />
            <HopDepthControl />
            <Separator />
            <LayoutSelector />
            <Separator />

            {/* Toggles */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground">Display</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs">Labels</span>
                <Switch checked={showLabels} onCheckedChange={toggleLabels} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Edge Particles</span>
                <Switch checked={showParticles} onCheckedChange={toggleParticles} />
              </div>
            </div>

            <Separator />
            <NodeTypeFilter />
            <Separator />
            <EdgeTypeFilter />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
