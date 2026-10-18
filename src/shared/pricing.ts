import { z } from "zod";

// Price of an image model before generating (roadmap step 7, ADR-0020/0021). Shared by server and panel.

export const UsdRange = z.object({ minUsd: z.number().min(0), maxUsd: z.number().min(0) });
export type UsdRange = z.infer<typeof UsdRange>;

export const ModelPrice = z.discriminatedUnion("kind", [
  /** Published USD per output image (a range over resolutions / endpoints); `input` per input image, null = not billed per image. */
  z.object({ kind: z.literal("per-image"), output: UsdRange, input: UsdRange.nullable() }),
  z.object({ kind: z.literal("per-token") }),
  z.object({ kind: z.literal("unknown") }),
]);
export type ModelPrice = z.infer<typeof ModelPrice>;

export const PriceResponse = z.object({ price: ModelPrice, fetchedAt: z.string() });
export type PriceResponse = z.infer<typeof PriceResponse>;

export const CostHistory = z.object({
  count: z.number().int().min(0),
  perImageMicros: z.number().int().min(0).nullable(),
});
export type CostHistory = z.infer<typeof CostHistory>;

export type Estimate =
  | { kind: "range"; minUsd: number; maxUsd: number; inputsPriced: boolean; fromHistory?: number }
  | { kind: "none"; reason: "per-token" | "unknown" };

const clean = (usd: number) => Math.round(usd * 1e9) / 1e9; // drop float noise, keep sub-cent precision

/** What the current request is expected to cost — never a recorded cost, never stored (spec AC-08). */
export function estimate(price: ModelPrice, req: { images: number; inputs: number; history?: CostHistory }): Estimate {
  if (price.kind === "per-image") {
    const inputsPriced = price.input !== null && req.inputs > 0 && price.input.maxUsd > 0;
    const inMin = inputsPriced && price.input ? req.inputs * price.input.minUsd : 0;
    const inMax = inputsPriced && price.input ? req.inputs * price.input.maxUsd : 0;
    return {
      kind: "range",
      minUsd: clean(req.images * price.output.minUsd + inMin),
      maxUsd: clean(req.images * price.output.maxUsd + inMax),
      inputsPriced,
    };
  }
  if (price.kind === "per-token") {
    const h = req.history;
    if (!h || h.count === 0 || h.perImageMicros === null) return { kind: "none", reason: "per-token" };
    const usd = clean((req.images * h.perImageMicros) / 1e6);
    return { kind: "range", minUsd: usd, maxUsd: usd, inputsPriced: false, fromHistory: h.count };
  }
  return { kind: "none", reason: "unknown" };
}

/** A unit price with as many decimals as it needs (2–4): $0.04, $0.007, $0.0184. */
function unit(usd: number): string {
  if (usd > 0 && usd < 0.00005) return "< $0.0001";
  const fixed = usd.toFixed(4).replace(/0+$/, "");
  const [whole, frac = ""] = fixed.split(".");
  return `$${whole}.${frac.padEnd(2, "0")}`;
}

/** An estimate amount, rounded up to the cent (never under-promise). */
function cents(usd: number): string {
  if (usd > 0 && usd < 0.01) return "< $0.01";
  return `$${(Math.ceil(usd * 100 - 1e-9) / 100).toFixed(2)}`;
}

export function describeUnitPrice(price: ModelPrice): string {
  if (price.kind === "per-token") return "priced per token";
  if (price.kind === "unknown") return "Price unknown";
  const { minUsd, maxUsd } = price.output;
  return minUsd === maxUsd ? `${unit(minUsd)} / image` : `${unit(minUsd)}–${unit(maxUsd)} / image`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** The labelled estimate line; `null` when there is nothing to estimate (unknown price). */
export function describeEstimate(e: Estimate, images: number, inputs: number): string | null {
  if (e.kind === "none") return e.reason === "per-token" ? "No estimate before generating" : null;
  const amount = e.minUsd === e.maxUsd ? cents(e.minUsd) : `${cents(e.minUsd)}–${cents(e.maxUsd)}`;
  const what = plural(images, "image") + (e.inputsPriced ? ` + ${plural(inputs, "input")}` : "");
  const from = e.fromHistory ? `, from your last ${plural(e.fromHistory, "generation")}` : "";
  return `Estimate ≈ ${amount} for ${what}${from}`;
}
