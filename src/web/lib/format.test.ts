import { describe, expect, it } from "vitest";
import { formatCost, formatDuration, formatRelative } from "./format";

describe("formatters", () => {
  it("formats micro-USD with at least two decimals and never shows an unknown price as $0", () => {
    expect(formatCost(40000, "known")).toBe("$0.04");
    expect(formatCost(125, "known")).toBe("$0.000125");
    expect(formatCost(0, "known")).toBe("$0.00");
    expect(formatCost(1_500_000, "known")).toBe("$1.50");
    expect(formatCost(null, "unavailable")).toBe("unavailable");
    expect(formatCost(null, "pending")).toBe("pending");
  });

  it("formats durations and relative times", () => {
    expect(formatDuration(850)).toBe("850 ms");
    expect(formatDuration(23_400)).toBe("23.4 s");
    const now = Date.parse("2026-10-18T12:00:00Z");
    expect(formatRelative("2026-10-18T11:59:40Z", now)).toBe("just now");
    expect(formatRelative("2026-10-18T11:58:00Z", now)).toBe("2 min ago");
    expect(formatRelative("2026-10-18T09:00:00Z", now)).toBe("3 h ago");
    expect(formatRelative("2026-10-10T09:00:00Z", now)).toBe("2026-10-10");
  });
});
