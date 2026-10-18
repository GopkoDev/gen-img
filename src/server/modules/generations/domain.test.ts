import { describe, expect, it } from "vitest";
import type { ImageModel } from "../../../shared/providers";
import { checkAgainstModel, parseStartRequest, toCost } from "./domain";

const model: ImageModel = {
  id: "test/model",
  name: "Test model",
  params: { aspectRatio: { values: ["1:1", "16:9"] }, n: { max: 2 } },
};

const valid = { provider: "openrouter", model: "test/model", prompt: "A cat", params: { n: 1 } };

describe("parseStartRequest", () => {
  it("accepts a valid request", () => {
    expect(parseStartRequest(valid)).toEqual({ ok: true, value: valid });
  });

  it("rejects a whitespace-only prompt, a missing model and n outside 1–4 with per-field messages", () => {
    const res = parseStartRequest({ ...valid, prompt: "  \n ", model: "", params: { n: 5 } });
    expect(res).toEqual({
      ok: false,
      fields: {
        prompt: "Prompt must not be empty",
        model: "Choose a model",
        "params.n": "Number of images must be between 1 and 4",
      },
    });
    expect(parseStartRequest({ ...valid, params: { n: 0 } })).toMatchObject({ ok: false });
  });

  it("rejects a non-integer seed and an unknown provider", () => {
    expect(parseStartRequest({ ...valid, params: { n: 1, seed: 1.5 } })).toMatchObject({
      ok: false,
      fields: { "params.seed": "Seed must be a whole number" },
    });
    expect(parseStartRequest({ ...valid, provider: "nope" })).toMatchObject({
      ok: false,
      fields: { provider: expect.any(String) },
    });
  });
});

describe("checkAgainstModel", () => {
  it("passes parameters the model supports", () => {
    expect(checkAgainstModel({ n: 2, aspectRatio: "16:9" }, model)).toEqual({});
  });

  it("flags unsupported values, an unsupported seed and n above the model maximum", () => {
    expect(checkAgainstModel({ n: 3, aspectRatio: "4:3", seed: 7 }, model)).toEqual({
      "params.n": "This model makes at most 2 images per request",
      "params.aspectRatio": "Aspect ratio must be one of 1:1, 16:9",
      "params.seed": "This model does not accept a seed",
    });
  });

  it("treats a model without an n entry as single-image", () => {
    expect(checkAgainstModel({ n: 2 }, { ...model, params: {} })).toEqual({
      "params.n": "This model makes at most 1 image per request",
    });
  });
});

describe("toCost", () => {
  it("keeps fractions of a cent exactly in micro-USD", () => {
    expect(toCost(0.000125)).toEqual({ costMicros: 125, costStatus: "known" });
    expect(toCost(0.04)).toEqual({ costMicros: 40000, costStatus: "known" });
    expect(toCost(0.0000004)).toEqual({ costMicros: 0, costStatus: "known" });
  });

  it("keeps a stated zero as known", () => {
    expect(toCost(0)).toEqual({ costMicros: 0, costStatus: "known" });
  });

  it("never turns a missing price into zero", () => {
    for (const missing of [undefined, null, Number.NaN, -1, "0.04"]) {
      expect(toCost(missing)).toEqual({ costMicros: null, costStatus: "unavailable" });
    }
  });
});
