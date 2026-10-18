import { describe, expect, it } from "vitest";
import { checkInputFile, MAX_INPUT_BYTES, MAX_INPUT_IMAGES } from "../../../shared/generations";
import type { ImageModel } from "../../../shared/providers";
import { checkAgainstModel, costFromResult, parseStartRequest, toCost } from "./domain";

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

describe("costFromResult", () => {
  it("uses a stated price, even with a cost reference", () => {
    expect(costFromResult(0.04, "gen_1")).toEqual({ costMicros: 40000, costStatus: "known", costRef: "gen_1" });
    expect(costFromResult(0, null)).toEqual({ costMicros: 0, costStatus: "known", costRef: null });
  });

  it("is pending when the price will come later and unavailable when it never will", () => {
    expect(costFromResult(null, "gen_1")).toEqual({ costMicros: null, costStatus: "pending", costRef: "gen_1" });
    expect(costFromResult(null, null)).toEqual({ costMicros: null, costStatus: "unavailable", costRef: null });
    expect(costFromResult(null, "")).toEqual({ costMicros: null, costStatus: "unavailable", costRef: null });
  });

  it("accepts the second provider id in a start request", () => {
    expect(parseStartRequest({ provider: "vercel", model: "bfl/flux-2-pro", prompt: "x", params: { n: 1 } }).ok).toBe(
      true,
    );
  });
});

describe("input images", () => {
  const withInputs = (min: number, max: number): ImageModel => ({
    ...model,
    params: { ...model.params, inputs: { min, max } },
  });
  const png = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 2, 0, 0, 0, 3,
  ]);

  it("accepts a count inside the model's input range", () => {
    expect(checkAgainstModel({ n: 1 }, withInputs(0, 4), 4)).toEqual({});
    expect(checkAgainstModel({ n: 1 }, withInputs(1, 4), 1)).toEqual({});
  });

  it("refuses inputs on a text-only model, too few for an edit model and too many", () => {
    expect(checkAgainstModel({ n: 1 }, model, 1)).toEqual({ inputs: "This model does not accept input images" });
    expect(checkAgainstModel({ n: 1 }, withInputs(1, 4), 0)).toEqual({
      inputs: "This model needs at least 1 input image",
    });
    expect(checkAgainstModel({ n: 1 }, withInputs(0, 4), 5)).toEqual({
      inputs: "This model takes at most 4 input images",
    });
  });

  it("caps any model at 8 input images", () => {
    expect(MAX_INPUT_IMAGES).toBe(8);
    expect(checkAgainstModel({ n: 1 }, withInputs(0, 20), 9)).toEqual({
      inputs: "This model takes at most 8 input images",
    });
  });

  it("checks each file: a supported picture of at most 10 MiB", () => {
    expect(checkInputFile(png, "a.png")).toEqual({ ok: true, image: { mediaType: "image/png", width: 2, height: 3 } });
    expect(checkInputFile(new TextEncoder().encode("not an image"), "photo.heic")).toEqual({
      ok: false,
      message: "photo.heic — not a supported image",
    });
    const big = new Uint8Array(MAX_INPUT_BYTES + 1);
    big.set(png);
    expect(checkInputFile(big, "big.png")).toEqual({ ok: false, message: "big.png — larger than 10 MB" });
    const exact = new Uint8Array(MAX_INPUT_BYTES);
    exact.set(png);
    expect(checkInputFile(exact, "ok.png").ok).toBe(true);
  });
});
