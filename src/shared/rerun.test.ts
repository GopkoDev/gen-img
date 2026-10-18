import { describe, expect, it } from "vitest";
import { carryParams, DerivedList, LineageSource, StartGenerationRequest } from "./generations";
import type { ImageModel } from "./providers";

const base = { provider: "openrouter", model: "m", prompt: "A cat", params: { n: 1 } };
const ref = (kind: "input" | "output", position: number) => ({ stored: { generationId: "01SRC", kind, position } });

describe("StartGenerationRequest — source and ordered inputs", () => {
  it("accepts a re-run with stored inputs and a reuse of one output", () => {
    expect(
      StartGenerationRequest.safeParse({
        ...base,
        source: { id: "01SRC", relation: "rerun" },
        inputs: [ref("input", 1), { upload: 1 }],
      }).success,
    ).toBe(true);
    expect(
      StartGenerationRequest.safeParse({
        ...base,
        source: { id: "01SRC", relation: "reuse", output: 2 },
        inputs: [ref("output", 2)],
      }).success,
    ).toBe(true);
    expect(StartGenerationRequest.safeParse(base).success).toBe(true); // older clients unchanged
  });

  it("rejects a reuse without its output, a re-run with one, bad references and more than 8 inputs", () => {
    const bad = (body: unknown) => StartGenerationRequest.safeParse(body).success;
    expect(bad({ ...base, source: { id: "01SRC", relation: "reuse" } })).toBe(false);
    expect(bad({ ...base, source: { id: "01SRC", relation: "rerun", output: 1 } })).toBe(false);
    expect(bad({ ...base, source: { id: "../x", relation: "rerun" } })).toBe(false);
    expect(bad({ ...base, inputs: [{ stored: { generationId: "01SRC", kind: "thumb", position: 1 } }] })).toBe(false);
    expect(bad({ ...base, inputs: [{ stored: { generationId: "01SRC", kind: "input", position: 0 } }] })).toBe(false);
    expect(bad({ ...base, inputs: [{ upload: 0 }] })).toBe(false);
    expect(bad({ ...base, inputs: Array.from({ length: 9 }, (_, i) => ({ upload: i + 1 })) })).toBe(false);
  });
});

describe("lineage DTO parts", () => {
  it("carries the source (or null) and the derived list with its total", () => {
    expect(LineageSource.nullable().safeParse(null).success).toBe(true);
    expect(
      LineageSource.safeParse({ id: "01S", relation: "reuse", output: 2, exists: false, prompt: null }).success,
    ).toBe(true);
    expect(
      DerivedList.safeParse({
        items: [{ id: "01D", relation: "rerun", output: null, createdAt: "2026-10-18T00:00:00.000Z", prompt: "p" }],
        total: 1,
      }).success,
    ).toBe(true);
  });
});

describe("carryParams — model switch", () => {
  const full: ImageModel = {
    id: "a",
    name: "A",
    params: { aspectRatio: { values: ["1:1", "16:9"] }, seed: {}, n: { max: 4 } },
  };
  const bare: ImageModel = { id: "b", name: "B", params: {} };

  it("keeps everything the new model supports", () => {
    expect(carryParams({ n: 2, seed: 7, aspectRatio: "16:9" }, full)).toEqual({
      params: { n: 2, seed: 7, aspectRatio: "16:9" },
      removed: [],
    });
  });

  it("removes and names what the new model can't take, and lowers the image count", () => {
    expect(carryParams({ n: 3, seed: 7, aspectRatio: "16:9" }, bare)).toEqual({
      params: { n: 1 },
      removed: ["seed", "aspect ratio", "images lowered to 1"],
    });
    expect(carryParams({ n: 1, aspectRatio: "4:3" }, full)).toEqual({ params: { n: 1 }, removed: ["aspect ratio"] });
  });
});
