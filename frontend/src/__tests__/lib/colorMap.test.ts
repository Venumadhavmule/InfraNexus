import { describe, it, expect } from "vitest";
import { getNodeConfig, getNodeColor, getStatusOpacity, CI_CLASS_CONFIG } from "@/lib/colorMap";

describe("colorMap", () => {
  it("returns config for known CI class", () => {
    const config = getNodeConfig("Server");
    expect(config.shape).toBe("box");
    expect(config.color).toBe("#4FC3F7");
    expect(config.size).toBeGreaterThan(0);
  });

  it("returns fallback for unknown CI class", () => {
    const config = getNodeConfig("UnknownType");
    expect(config.shape).toBe("sphere");
    expect(config.color).toBe("#90A4AE");
  });

  it("getNodeColor returns hex string", () => {
    expect(getNodeColor("Database")).toBe("#FFB74D");
    expect(getNodeColor("NonExistent")).toBe("#90A4AE");
  });

  it("getStatusOpacity returns correct values", () => {
    expect(getStatusOpacity(1)).toBe(1.0);
    expect(getStatusOpacity(2)).toBe(0.5);
    expect(getStatusOpacity(3)).toBe(0.6);
    expect(getStatusOpacity(4)).toBe(0.25);
    expect(getStatusOpacity(99)).toBe(0.8);
  });

  it("has entries for major CI classes", () => {
    const requiredClasses = ["Server", "Database", "Application", "Service", "Network", "Container"];
    for (const cls of requiredClasses) {
      expect(CI_CLASS_CONFIG[cls]).toBeDefined();
    }
  });
});
