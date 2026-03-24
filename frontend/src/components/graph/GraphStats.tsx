"use client";

import { useGraphStore } from "@/store/graphStore";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/utils";

export function GraphStats() {
  const nodeCount = useGraphStore((s) => s.nodes.size);
  const edgeCount = useGraphStore((s) => s.edges.size);
  const truncated = useGraphStore((s) => s.truncated);

  if (nodeCount === 0) return null;

  return (
    <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2">
      <Badge variant="secondary" className="text-xs">
        {formatCount(nodeCount)} nodes
      </Badge>
      <Badge variant="secondary" className="text-xs">
        {formatCount(edgeCount)} edges
      </Badge>
      {truncated && (
        <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
          Truncated
        </Badge>
      )}
    </div>
  );
}
