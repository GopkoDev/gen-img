import { describe, expect, it } from "vitest";
import { dialogViews, type GalleryView, parseView, viewKey, viewSearch } from "./galleryView";

const KEY = "0123456789abcdef0123456789abcdef";

describe("galleryView", () => {
  it("parses all / model / models", () => {
    expect(parseView("")).toEqual({ kind: "all" });
    expect(parseView("?view=models")).toEqual({ kind: "models" });
    expect(parseView("?provider=openrouter&model=a%2Fb")).toEqual({
      kind: "model",
      provider: "openrouter",
      model: "a/b",
    });
  });
  it("only one of provider/model, or unknown view, is all", () => {
    expect(parseView("?provider=x")).toEqual({ kind: "all" });
    expect(parseView("?model=x")).toEqual({ kind: "all" });
    expect(parseView("?view=other")).toEqual({ kind: "all" });
    expect(parseView("?provider=&model=")).toEqual({ kind: "all" });
  });
  it("serializes", () => {
    expect(viewSearch({ kind: "all" })).toBe("");
    expect(viewSearch({ kind: "models" })).toBe("?view=models");
    expect(viewSearch({ kind: "model", provider: "p", model: "m" })).toBe("?provider=p&model=m");
  });
  it("round-trips odd ids", () => {
    const v: GalleryView = { kind: "model", provider: "Vercel:AI", model: "Google/Gemini 2.5+Flash: Image" };
    expect(parseView(viewSearch(v))).toEqual(v);
  });
  it("keys", () => {
    expect(viewKey({ kind: "all" })).toEqual(["generations"]);
    expect(viewKey({ kind: "models" })).toEqual(["generations", "models"]);
    expect(viewKey({ kind: "model", provider: "p", model: "m" })).toEqual(["generations", "model", "p", "m"]);
  });
  it("parses the prompt views", () => {
    expect(parseView("?view=prompts")).toEqual({ kind: "prompts", single: false });
    expect(parseView("?view=prompts&single=1")).toEqual({ kind: "prompts", single: true });
    expect(parseView(`?prompt=${KEY}`)).toEqual({ kind: "prompt", key: KEY });
  });
  it("any other prompt= value is the prompt view's invalid state, never All", () => {
    expect(parseView("?prompt=xyz")).toEqual({ kind: "prompt", key: "xyz", invalid: true });
    expect(parseView(`?prompt=${KEY.toUpperCase()}`)).toEqual({
      kind: "prompt",
      key: KEY.toUpperCase(),
      invalid: true,
    });
    expect(parseView(`?prompt=${KEY}0`)).toMatchObject({ kind: "prompt", invalid: true });
  });
  it("round-trips the prompt views", () => {
    expect(viewSearch({ kind: "prompts", single: false })).toBe("?view=prompts");
    expect(viewSearch({ kind: "prompts", single: true })).toBe("?view=prompts&single=1");
    expect(viewSearch({ kind: "prompt", key: KEY })).toBe(`?prompt=${KEY}`);
    for (const v of [
      { kind: "prompts", single: true },
      { kind: "prompts", single: false },
      { kind: "prompt", key: KEY },
      { kind: "prompt", key: "xyz", invalid: true },
    ] as GalleryView[])
      expect(parseView(viewSearch(v))).toEqual(v);
  });
  it("keys for the prompt views", () => {
    expect(viewKey({ kind: "prompts", single: true })).toEqual(["generations", "prompts", true]);
    expect(viewKey({ kind: "prompt", key: KEY })).toEqual(["generations", "prompt", KEY]);
  });
  it("dialog state accepts the prompt kinds", () => {
    const grid = { kind: "prompt", key: KEY };
    const order = { kind: "prompts", single: true };
    expect(dialogViews({ grid, order })).toEqual({ grid, order });
    expect(dialogViews({ grid: { kind: "prompt", key: 5 } })).toEqual({});
  });
});
