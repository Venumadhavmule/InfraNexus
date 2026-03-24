import { describe, it, expect } from "vitest";
import {
  isValidSysId,
  truncateText,
  formatCount,
  formatDuration,
  operationalStatusLabel,
} from "@/lib/utils";

describe("utils", () => {
  describe("isValidSysId", () => {
    it("accepts 32 lowercase hex chars", () => {
      expect(isValidSysId("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4")).toBe(true);
    });

    it("rejects invalid sys_ids", () => {
      expect(isValidSysId("")).toBe(false);
      expect(isValidSysId("too-short")).toBe(false);
      expect(isValidSysId("A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4")).toBe(false); // uppercase
      expect(isValidSysId("a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4z")).toBe(false); // too long
    });
  });

  describe("truncateText", () => {
    it("returns original text if within limit", () => {
      expect(truncateText("hello", 10)).toBe("hello");
    });

    it("truncates with ellipsis", () => {
      expect(truncateText("hello world", 8)).toBe("hello w…");
    });
  });

  describe("formatCount", () => {
    it("formats thousands", () => {
      expect(formatCount(1500)).toBe("1.5K");
      expect(formatCount(1_200_000)).toBe("1.2M");
      expect(formatCount(42)).toBe("42");
    });
  });

  describe("formatDuration", () => {
    it("formats seconds", () => {
      expect(formatDuration(45)).toBe("45s");
    });

    it("formats minutes", () => {
      expect(formatDuration(90)).toBe("1m 30s");
    });

    it("formats hours", () => {
      expect(formatDuration(3661)).toBe("1h 1m");
    });
  });

  describe("operationalStatusLabel", () => {
    it("returns correct labels", () => {
      expect(operationalStatusLabel(1)).toBe("Operational");
      expect(operationalStatusLabel(2)).toBe("Non-Operational");
      expect(operationalStatusLabel(3)).toBe("Repair in Progress");
      expect(operationalStatusLabel(4)).toBe("Retired");
      expect(operationalStatusLabel(99)).toBe("Unknown");
    });
  });
});
