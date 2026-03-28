"use client";

import { useUIStore } from "@/store/uiStore";
import { useGraphStore } from "@/store/graphStore";
import { CIInspector } from "./CIInspector";
import { cn } from "@/lib/utils";

export function LeftPanel() {
  const open = useUIStore((s) => s.leftPanelOpen);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-30 h-full w-80 border-r border-border/30 bg-background/95 shadow-[inset_-1px_0_0_rgba(0,0,0,0.03)] backdrop-blur-sm transition-transform duration-200",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/30 bg-gradient-to-r from-primary/8 via-transparent to-transparent px-4 py-3">
          <h2 className="text-sm font-semibold">CI Inspector</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedNodeId ? (
            <CIInspector />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              Select a node to inspect its details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
