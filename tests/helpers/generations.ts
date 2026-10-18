import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Db } from "../../src/server/db/client";
import { createGenerationsRepo, type NewGeneration } from "../../src/server/modules/generations/repo";
import { fixture } from "./fake-fetch";

const PNG_B64 = (fixture("openrouter/images-success.json") as { data: { b64_json: string }[] }).data[0]?.b64_json ?? "";
export const TINY_PNG = new Uint8Array(Buffer.from(PNG_B64, "base64")); // 4×3

let seq = 0;

/** Inserts a complete generation (rows + tiny PNG files on disk). No PII — test prompts only. */
export function seedGeneration(db: Db, dataDir: string, overrides: Partial<NewGeneration> & { images?: number } = {}) {
  seq += 1;
  const { images = 1, ...rest } = overrides;
  const id = rest.id ?? `01SEED${String(seq).padStart(20, "0")}`;
  const gen: NewGeneration = {
    id,
    provider: "openrouter",
    model: "test/model",
    prompt: `A test prompt ${seq}`,
    requestedParams: { n: images },
    acceptedParams: null,
    imagesRequested: images,
    costMicros: 40000,
    costStatus: "known",
    createdAt: new Date(Date.UTC(2026, 9, 18, 12, 0, seq % 60)).toISOString(),
    durationMs: 1234,
    rawRequest: { method: "POST", url: "https://openrouter.ai/api/v1/images", body: { prompt: "A test prompt" } },
    rawResponse: { data: [] },
    ...rest,
  };
  const dir = join(dataDir, "generations", id);
  mkdirSync(dir, { recursive: true });
  const rows = Array.from({ length: images }, (_, i) => {
    writeFileSync(join(dir, `output-${i + 1}.png`), TINY_PNG);
    return {
      position: i + 1,
      path: `generations/${id}/output-${i + 1}.png`,
      mediaType: "image/png" as const,
      width: 4,
      height: 3,
      byteSize: TINY_PNG.byteLength,
    };
  });
  createGenerationsRepo(db).insertAtomic(gen, rows, () => {});
  return { ...gen, images: rows };
}
