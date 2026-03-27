"use client";

import { useGraphStore } from "@/store/graphStore";
import { useETLStore } from "@/store/etlStore";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  resetting_tables: "Resetting graph store",
  fetching_rel_types: "Fetching relationship types",
  fetching_cis: "Fetching configuration items",
  loading_cis: "Loading nodes into Kuzu",
  fetching_relationships: "Fetching relationships",
  loading_relationships: "Loading edges into Kuzu",
  updating_degrees: "Updating degree counts",
  indexing_search: "Indexing search data",
  fetching_changed_cis: "Fetching changed items",
  fetching_changed_relationships: "Fetching changed relationships",
};

export function StatusBar() {
  const nodeCount = useGraphStore((s) => s.nodes.size);
  const edgeCount = useGraphStore((s) => s.edges.size);
  const truncated = useGraphStore((s) => s.truncated);
  const loading = useGraphStore((s) => s.loading);
  const etlStatus = useETLStore((s) => s.status);
  const etlProgress = useETLStore((s) => s.progress);
  const currentStage = useETLStore((s) => s.currentStage);
  const lastError = useETLStore((s) => s.lastError);

  const stageLabel = currentStage ? STAGE_LABELS[currentStage] ?? currentStage : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex h-9 items-center justify-between border-t border-border/40 bg-background/85 px-4 text-xs text-foreground backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
          {formatCount(nodeCount)} nodes
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
          {formatCount(edgeCount)} edges
        </span>
        {truncated && (
          <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400/30">
            Truncated
          </Badge>
        )}
        {loading && (
          <span className="animate-pulse text-blue-400">Loading…</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {etlStatus !== "idle" && (
          <div className="flex items-center gap-2">
            <span className={cn("flex items-center gap-1", etlStatus === "failed" ? "text-red-400" : "text-green-400")}>
              <span className={cn("inline-block h-2 w-2 rounded-full", etlStatus === "running" ? "bg-green-400 animate-pulse" : "bg-red-400")} />
              ETL: {etlStatus}
              {etlStatus === "running" && ` (${etlProgress}%)`}
            </span>
            {stageLabel && (
              <Badge variant="outline" className="border-primary/25 bg-primary/5 text-[10px] text-foreground">
                {stageLabel}
              </Badge>
            )}
            {etlStatus === "failed" && lastError && (
              <span className="max-w-[28rem] truncate text-red-300" title={lastError}>
                {lastError}
              </span>
            )}
          </div>
        )}
        <span className="text-muted-foreground/60">
          Press <kbd className="rounded border border-border px-1 font-mono">?</kbd> for shortcuts
        </span>
      </div>
    </div>
  );
}
