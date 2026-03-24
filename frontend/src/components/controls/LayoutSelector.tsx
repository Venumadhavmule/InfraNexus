"use client";

import { useUIStore } from "@/store/uiStore";
import { Button } from "@/components/ui/button";
import type { LayoutMode } from "@/types";
import { cn } from "@/lib/utils";

const LAYOUTS: { value: LayoutMode; label: string }[] = [
  { value: "force3d", label: "Force 3D" },
  { value: "dagre", label: "Hierarchical" },
  { value: "radial", label: "Radial" },
];

export function LayoutSelector() {
  const layoutMode = useUIStore((s) => s.layoutMode);
  const setLayoutMode = useUIStore((s) => s.setLayoutMode);

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-muted-foreground">Layout</h3>
      <div className="flex flex-col gap-1">
        {LAYOUTS.map(({ value, label }) => (
          <Button
            key={value}
            variant={layoutMode === value ? "default" : "ghost"}
            size="sm"
            className={cn("justify-start text-xs", layoutMode === value && "pointer-events-none")}
            onClick={() => setLayoutMode(value)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
