"use client";

import { useTransition } from "react";
import { useGraphStore } from "@/store/graphStore";
import { useNeighborhood } from "@/hooks/useNeighborhood";
import { Button } from "@/components/ui/button";
import type { HopDepth } from "@/types";
import { cn } from "@/lib/utils";

const HOPS: HopDepth[] = [1, 2, 3];

export function HopDepthControl() {
  const hops = useGraphStore((s) => s.hops);
  const centerId = useGraphStore((s) => s.centerId);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const setHops = useGraphStore((s) => s.setHops);
  const { loadNeighborhood } = useNeighborhood();
  const [isPending, startTransition] = useTransition();

  const applyHopDepth = (nextHop: HopDepth) => {
    if (nextHop === hops) {
      return;
    }

    // Prefer the actively selected node so hops always re-fetch the user-chosen CI,
    // not the original search center (which may differ after in-canvas node clicks).
    const targetId = selectedNodeId ?? centerId;
    setHops(nextHop);
    if (targetId) {
      startTransition(() => {
        void loadNeighborhood(targetId);
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground">Hop Depth</h3>
        <span className="text-[11px] text-muted-foreground">
          {isPending ? "Refreshing..." : centerId ? "Applies now" : "Applies on next load"}
        </span>
      </div>
      <div className="flex gap-1">
        {HOPS.map((h) => (
          <Button
            key={h}
            variant={hops === h ? "default" : "outline"}
            size="sm"
            className={cn("flex-1 text-xs", hops === h && "pointer-events-none")}
            onClick={() => applyHopDepth(h)}
          >
            {h} hop{h > 1 ? "s" : ""}
          </Button>
        ))}
      </div>
    </div>
  );
}
