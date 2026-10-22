import { describe, expect, it } from "vitest";
import type { ImageModel } from "../../../shared/providers";
import { describeParams } from "./params";

const model = (params: ImageModel["params"]): ImageModel => ({ id: "m", name: "M", params });

describe("describeParams", () => {
  it("renders every supported parameter", () => {
    expect(
      describeParams(
        model({
          aspectRatio: { values: ["1:1", "16:9"] },
          seed: {},
          n: { max: 4 },
          inputs: { min: 1, max: 8 },
        }),
      ),
    ).toEqual({ aspectRatios: "1:1, 16:9", seed: "yes", images: "up to 4", inputs: "1–8" });
  });

  it("renders an em dash for unsupported aspect ratios, seed and inputs; images fall back to up to 1", () => {
    expect(describeParams(model({}))).toEqual({
      aspectRatios: "—",
      seed: "—",
      images: "up to 1",
      inputs: "—",
    });
  });

  it("renders inputs min 0 max 8 as 0–8", () => {
    expect(describeParams(model({ inputs: { min: 0, max: 8 } })).inputs).toBe("0–8");
  });
});
