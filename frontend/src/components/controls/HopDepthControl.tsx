"use client";

import { useGraphStore } from "@/store/graphStore";
import { Button } from "@/components/ui/button";
import type { HopDepth } from "@/types";
import { cn } from "@/lib/utils";

const HOPS: HopDepth[] = [1, 2, 3];

export function HopDepthControl() {
  const hops = useGraphStore((s) => s.hops);
  const setHops = useGraphStore((s) => s.setHops);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">Hop Depth</h3>
      <div className="flex gap-1">
        {HOPS.map((h) => (
          <Button
            key={h}
            variant={hops === h ? "default" : "outline"}
            size="sm"
            className={cn("flex-1 text-xs", hops === h && "pointer-events-none")}
            onClick={() => setHops(h)}
          >
            {h} hop{h > 1 ? "s" : ""}
          </Button>
        ))}
      </div>
    </div>
  );
}
