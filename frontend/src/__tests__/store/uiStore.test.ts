import { describe, it, expect } from "vitest";
import { act } from "@testing-library/react";
import { useUIStore } from "@/store/uiStore";

describe("uiStore", () => {
  it("toggles left panel", () => {
    const initial = useUIStore.getState().leftPanelOpen;
    act(() => useUIStore.getState().toggleLeftPanel());
    expect(useUIStore.getState().leftPanelOpen).toBe(!initial);
  });

  it("toggles theme", () => {
    act(() => useUIStore.getState().setTheme("dark"));
    expect(useUIStore.getState().theme).toBe("dark");

    act(() => useUIStore.getState().toggleTheme());
    expect(useUIStore.getState().theme).toBe("light");

    act(() => useUIStore.getState().toggleTheme());
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("sets layout mode", () => {
    act(() => useUIStore.getState().setLayoutMode("radial"));
    expect(useUIStore.getState().layoutMode).toBe("radial");
  });

  it("toggles display options", () => {
    const labels = useUIStore.getState().showLabels;
    act(() => useUIStore.getState().toggleLabels());
    expect(useUIStore.getState().showLabels).toBe(!labels);

    const particles = useUIStore.getState().showParticles;
    act(() => useUIStore.getState().toggleParticles());
    expect(useUIStore.getState().showParticles).toBe(!particles);
  });

  it("manages search and help open state", () => {
    act(() => useUIStore.getState().setSearchOpen(true));
    expect(useUIStore.getState().searchOpen).toBe(true);

    act(() => useUIStore.getState().setHelpOpen(true));
    expect(useUIStore.getState().helpOpen).toBe(true);
  });
});
