"use client";

import { useGraphStore } from "@/store/graphStore";
import { Checkbox } from "@/components/ui/checkbox";
import { getEdgeStyle } from "@/lib/edgeStyles";

export function EdgeTypeFilter() {
  const availableRelTypes = useGraphStore((s) => s.availableRelTypes);
  const filters = useGraphStore((s) => s.filters);
  const toggleRelTypeFilter = useGraphStore((s) => s.toggleRelTypeFilter);

  const relTypes = availableRelTypes();

  if (relTypes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">
        Edge Types ({relTypes.length})
      </h3>
      <div className="space-y-1.5">
        {relTypes.map((rel) => {
          const active = filters.relTypes.size === 0 || filters.relTypes.has(rel);
          const style = getEdgeStyle(rel);
          return (
            <label
              key={rel}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent"
            >
              <Checkbox
                checked={active}
                onCheckedChange={() => toggleRelTypeFilter(rel)}
              />
              <span
                className="inline-block h-0.5 w-4"
                style={{
                  backgroundColor: style.color,
                  borderStyle: style.dashed ? "dashed" : "solid",
                }}
              />
              <span>{rel}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
