import { describe, expect, it } from "vitest";
import { neighbours } from "./neighbours";

const ids = (...xs: string[]) => xs.map((id) => ({ id }));

describe("neighbours", () => {
  const items = ids("c", "b", "a"); // newest first

  it("middle item has newer (previous) and older (next)", () => {
    expect(neighbours(items, "b")).toEqual({
      newer: "c",
      older: "a",
      atEnd: false,
      inOrder: true,
    });
  });

  it("first item has no newer", () => {
    expect(neighbours(items, "c")).toEqual({
      newer: null,
      older: "b",
      atEnd: false,
      inOrder: true,
    });
  });

  it("last item has no older and atEnd", () => {
    expect(neighbours(items, "a")).toEqual({
      newer: "b",
      older: null,
      atEnd: true,
      inOrder: true,
    });
  });

  it("single item is first and last", () => {
    expect(neighbours(ids("x"), "x")).toEqual({
      newer: null,
      older: null,
      atEnd: true,
      inOrder: true,
    });
  });

  it("id not in items is out of order with no neighbours", () => {
    expect(neighbours(items, "zzz")).toEqual({
      newer: null,
      older: null,
      atEnd: false,
      inOrder: false,
    });
    expect(neighbours([], "a").inOrder).toBe(false);
  });

  it("prepending items only changes newer of the old first item", () => {
    const before = neighbours(items, "c");
    const after = neighbours([...ids("e", "d"), ...items], "c");
    expect(after.older).toBe(before.older);
    expect(after.newer).toBe("d");
    const mid = neighbours(items, "b");
    expect(neighbours([...ids("e", "d"), ...items], "b")).toEqual(mid);
  });
});
