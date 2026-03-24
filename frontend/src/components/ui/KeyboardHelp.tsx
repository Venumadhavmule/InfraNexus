"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUIStore } from "@/store/uiStore";

const SHORTCUTS = [
  { key: "/", description: "Focus search" },
  { key: "Esc", description: "Close search / deselect" },
  { key: "1 / 2 / 3", description: "Set hop depth" },
  { key: "R", description: "Reset camera" },
  { key: "F", description: "Zoom to fit" },
  { key: "L", description: "Toggle labels" },
  { key: "M", description: "Toggle minimap" },
  { key: "D", description: "Toggle dark/light" },
  { key: "[", description: "Toggle left panel" },
  { key: "]", description: "Toggle right panel" },
  { key: "?", description: "This help dialog" },
] as const;

export function KeyboardHelp() {
  const helpOpen = useUIStore((s) => s.helpOpen);
  const setHelpOpen = useUIStore((s) => s.setHelpOpen);

  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map(({ key, description }) => (
            <div key={key} className="contents">
              <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">
                {key}
              </kbd>
              <span className="text-muted-foreground">{description}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
