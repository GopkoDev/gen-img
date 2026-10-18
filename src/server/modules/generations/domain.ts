import type { z } from "zod";
import { type RequestedParams, StartGenerationRequest } from "../../../shared/generations";
import type { ImageModel } from "../../../shared/providers";

export type FieldErrors = Record<string, string>;
export type CostStatus = "known" | "pending" | "unavailable";

function fieldErrors(error: z.ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fields[key] ??= issue.message;
  }
  return fields;
}

/** Validates a start-generation body; failures come back as one plain-language message per field. */
export function parseStartRequest(
  body: unknown,
): { ok: true; value: StartGenerationRequest } | { ok: false; fields: FieldErrors } {
  const parsed = StartGenerationRequest.safeParse(body);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, fields: fieldErrors(parsed.error) };
}

/** Checks requested parameters against what the chosen model lists as supported. Empty result = ok. */
export function checkAgainstModel(params: RequestedParams, model: ImageModel): FieldErrors {
  const fields: FieldErrors = {};
  const maxN = model.params.n?.max ?? 1;
  if (params.n > maxN)
    fields["params.n"] = `This model makes at most ${maxN} image${maxN === 1 ? "" : "s"} per request`;

  if (params.aspectRatio !== undefined) {
    const values = model.params.aspectRatio?.values;
    if (!values) fields["params.aspectRatio"] = "This model does not accept an aspect ratio";
    else if (!values.includes(params.aspectRatio))
      fields["params.aspectRatio"] = `Aspect ratio must be one of ${values.join(", ")}`;
  }

  if (params.seed !== undefined) {
    const seed = model.params.seed;
    if (!seed) fields["params.seed"] = "This model does not accept a seed";
    else if ((seed.min !== undefined && params.seed < seed.min) || (seed.max !== undefined && params.seed > seed.max))
      fields["params.seed"] = `Seed must be between ${seed.min ?? "any"} and ${seed.max ?? "any"}`;
  }
  return fields;
}

/** Provider USD → integer micro-USD. A missing or malformed price is `unavailable`, never zero. */
export function toCost(usd: unknown): { costMicros: number | null; costStatus: CostStatus } {
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0)
    return { costMicros: null, costStatus: "unavailable" };
  return { costMicros: Math.round(usd * 1e6), costStatus: "known" };
}
