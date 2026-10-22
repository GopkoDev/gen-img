import { describe, expect, it } from "vitest";
import { type GalleryView, parseView, viewKey, viewSearch } from "./galleryView";

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
});
