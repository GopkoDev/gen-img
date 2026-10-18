import { describe, expect, it } from "vitest";
import { describeEstimate, describeUnitPrice, estimate, type ModelPrice } from "./pricing";

const exact = (usd: number, input: number | null = null): ModelPrice => ({
  kind: "per-image",
  output: { minUsd: usd, maxUsd: usd },
  input: input === null ? null : { minUsd: input, maxUsd: input },
});

describe("a published free price", () => {
  it("is shown as $0.00 — free is a published price, unlike «unknown»", () => {
    expect(describeUnitPrice(exact(0))).toMatch(/^\$0\.00 \/ image/);
    expect(describeEstimate(estimate(exact(0), { images: 2, inputs: 0 }), 2, 0)).toMatch(
      /^Estimate ≈ \$0\.00 for 2 images/,
    );
    expect(describeUnitPrice({ kind: "unknown" })).not.toMatch(/\$0/);
  });
});

describe("estimate", () => {
  it("multiplies a per-image price by the number of images and adds per-image inputs", () => {
    expect(estimate(exact(0.0184), { images: 2, inputs: 0 })).toEqual({
      kind: "range",
      minUsd: 0.0368,
      maxUsd: 0.0368,
      inputsPriced: false,
    });
    expect(estimate(exact(0.02, 0.01), { images: 2, inputs: 1 })).toEqual({
      kind: "range",
      minUsd: 0.05,
      maxUsd: 0.05,
      inputsPriced: true,
    });
    expect(estimate(exact(0.02, 0), { images: 1, inputs: 3 })).toMatchObject({ minUsd: 0.02, inputsPriced: false }); // free inputs aren't «priced»
    expect(estimate(exact(0.02), { images: 1, inputs: 3 })).toMatchObject({ minUsd: 0.02, inputsPriced: false }); // unknown input price: not added
  });

  it("keeps a range when the model has several prices", () => {
    const price: ModelPrice = { kind: "per-image", output: { minUsd: 0.045, maxUsd: 0.151 }, input: null };
    expect(estimate(price, { images: 2, inputs: 0 })).toMatchObject({ minUsd: 0.09, maxUsd: 0.302 });
  });

  it("estimates per-token models only from known past costs", () => {
    expect(
      estimate({ kind: "per-token" }, { images: 2, inputs: 0, history: { count: 5, perImageMicros: 60_000 } }),
    ).toEqual({
      kind: "range",
      minUsd: 0.12,
      maxUsd: 0.12,
      inputsPriced: false,
      fromHistory: 5,
    });
    expect(
      estimate({ kind: "per-token" }, { images: 2, inputs: 0, history: { count: 0, perImageMicros: null } }),
    ).toEqual({
      kind: "none",
      reason: "per-token",
    });
    expect(estimate({ kind: "per-token" }, { images: 2, inputs: 0 })).toEqual({ kind: "none", reason: "per-token" });
  });

  it("never estimates an unknown price", () => {
    expect(estimate({ kind: "unknown" }, { images: 4, inputs: 0 })).toEqual({ kind: "none", reason: "unknown" });
  });
});

describe("wording", () => {
  it("shows unit prices with as many decimals as needed and ranges as ranges", () => {
    expect(describeUnitPrice(exact(0.0184))).toBe("$0.0184 / image");
    expect(describeUnitPrice(exact(0.04))).toBe("$0.04 / image");
    expect(describeUnitPrice(exact(0.007))).toBe("$0.007 / image");
    expect(describeUnitPrice(exact(0.1344))).toBe("$0.1344 / image");
    expect(describeUnitPrice({ kind: "per-image", output: { minUsd: 0.045, maxUsd: 0.151 }, input: null })).toBe(
      "$0.045–$0.151 / image",
    );
    expect(describeUnitPrice({ kind: "per-token" })).toBe("priced per token");
    expect(describeUnitPrice({ kind: "unknown" })).toBe("Price unknown");
  });

  it("rounds estimates up to the cent, labels them, and names inputs and history", () => {
    expect(describeEstimate(estimate(exact(0.0184), { images: 2, inputs: 0 }), 2, 0)).toBe(
      "Estimate ≈ $0.04 for 2 images",
    );
    expect(describeEstimate(estimate(exact(0.02, 0.01), { images: 2, inputs: 1 }), 2, 1)).toBe(
      "Estimate ≈ $0.05 for 2 images + 1 input",
    );
    expect(describeEstimate(estimate(exact(0.003), { images: 1, inputs: 0 }), 1, 0)).toBe(
      "Estimate ≈ < $0.01 for 1 image",
    );
    expect(
      describeEstimate(
        estimate(
          { kind: "per-image", output: { minUsd: 0.045, maxUsd: 0.151 }, input: null },
          { images: 2, inputs: 0 },
        ),
        2,
        0,
      ),
    ).toBe("Estimate ≈ $0.09–$0.31 for 2 images");
    expect(
      describeEstimate(
        estimate({ kind: "per-token" }, { images: 2, inputs: 0, history: { count: 5, perImageMicros: 60_000 } }),
        2,
        0,
      ),
    ).toBe("Estimate ≈ $0.12 for 2 images, from your last 5 generations");
    expect(describeEstimate(estimate({ kind: "per-token" }, { images: 2, inputs: 0 }), 2, 0)).toBe(
      "No estimate before generating",
    );
    expect(describeEstimate(estimate({ kind: "unknown" }, { images: 2, inputs: 0 }), 2, 0)).toBeNull();
  });
});
