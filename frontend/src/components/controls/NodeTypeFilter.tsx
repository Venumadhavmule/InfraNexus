"use client";

import { useGraphStore } from "@/store/graphStore";
import { Checkbox } from "@/components/ui/checkbox";
import { getNodeColor } from "@/lib/colorMap";

export function NodeTypeFilter() {
  const availableClasses = useGraphStore((s) => s.availableClasses);
  const filters = useGraphStore((s) => s.filters);
  const toggleClassFilter = useGraphStore((s) => s.toggleClassFilter);

  const classes = availableClasses();

  if (classes.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">
        Node Types ({classes.length})
      </h3>
      <div className="space-y-1.5">
        {classes.map((cls) => {
          const active = filters.ciClasses.size === 0 || filters.ciClasses.has(cls);
          return (
            <label
              key={cls}
              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-accent"
            >
              <Checkbox
                checked={active}
                onCheckedChange={() => toggleClassFilter(cls)}
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getNodeColor(cls) }}
              />
              <span>{cls}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
