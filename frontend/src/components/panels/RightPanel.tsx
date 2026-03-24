"use client";

import { useUIStore } from "@/store/uiStore";
import { HopDepthControl } from "@/components/controls/HopDepthControl";
import { NodeTypeFilter } from "@/components/controls/NodeTypeFilter";
import { EdgeTypeFilter } from "@/components/controls/EdgeTypeFilter";
import { LayoutSelector } from "@/components/controls/LayoutSelector";
import { ThemeToggle } from "@/components/controls/ThemeToggle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function RightPanel() {
  const open = useUIStore((s) => s.rightPanelOpen);
  const showLabels = useUIStore((s) => s.showLabels);
  const showParticles = useUIStore((s) => s.showParticles);
  const toggleLabels = useUIStore((s) => s.toggleLabels);
  const toggleParticles = useUIStore((s) => s.toggleParticles);

  return (
    <div
      className={cn(
        "fixed right-0 top-0 z-30 h-full w-72 border-l border-border/40 bg-background/95 backdrop-blur-sm transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
          <h2 className="text-sm font-semibold">Controls</h2>
          <ThemeToggle />
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
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
