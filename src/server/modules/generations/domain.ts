import type { z } from "zod";
import { type FieldErrors, StartGenerationRequest } from "../../../shared/generations";

// Shared with the web client so both sides validate parameters identically.
export { checkAgainstModel, type FieldErrors } from "../../../shared/generations";

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

/** Provider USD → integer micro-USD. A missing or malformed price is `unavailable`, never zero. */
export function toCost(usd: unknown): { costMicros: number | null; costStatus: CostStatus } {
  if (typeof usd !== "number" || !Number.isFinite(usd) || usd < 0)
    return { costMicros: null, costStatus: "unavailable" };
  return { costMicros: Math.round(usd * 1e6), costStatus: "known" };
}
