import { createHash } from "node:crypto";

/** Grouping key of a prompt: 32 hex chars of SHA-256 over the exact UTF-8 text (no trim, case fold or normalisation; ADR-0037). */
export function promptKey(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 32);
}
