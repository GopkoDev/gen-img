import { describe, expect, it } from "vitest";
import {
  excerpt,
  formatCost,
  formatCostBadge,
  formatCount,
  formatDuration,
  formatRelative,
  formatSize,
} from "./format";

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

describe("excerpt", () => {
  it("keeps short text and cuts long text at ~80 characters with an ellipsis", () => {
    expect(excerpt("A cat")).toBe("A cat");
    const long = "word ".repeat(40).trim();
    const cut = excerpt(long);
    expect(cut.endsWith("…")).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(81);
    expect(long.startsWith(cut.slice(0, -1).trimEnd())).toBe(true);
  });
});

describe("badge wording", () => {
  it("words the cost badge: known amount, «cost pending», «cost unavailable», never $0 unless known", () => {
    expect(formatCostBadge(40000, "known")).toBe("$0.04");
    expect(formatCostBadge(0, "known")).toBe("$0.00");
    expect(formatCostBadge(null, "pending")).toBe("cost pending");
    expect(formatCostBadge(null, "unavailable")).toBe("cost unavailable");
    expect(formatCostBadge(0, "pending")).toBe("cost pending");
    expect(formatCostBadge(0, "unavailable")).toBe("cost unavailable");
  });

  it("words the size with U+00D7", () => {
    expect(formatSize(1024, 1024)).toBe("1024\u00d71024");
    expect(formatSize(1536, 1024)).toBe("1536\u00d71024");
  });

  it("words the count only when it adds information", () => {
    expect(formatCount(1, 1)).toBeNull();
    expect(formatCount(4, 4)).toBe("4 images");
    expect(formatCount(2, 4)).toBe("2 of 4 images");
    expect(formatCount(1, 4)).toBe("1 of 4 images");
    expect(formatCount(0, 1)).toBe("0 of 1 images");
  });
});
