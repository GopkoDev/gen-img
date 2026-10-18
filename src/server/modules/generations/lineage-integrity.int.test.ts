import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedGeneration, TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import type { ImageModel } from "../../../shared/providers";
import { createModelCatalog } from "../providers/catalog";
import type { ImageProvider } from "../providers/port";
import { registryOf } from "../providers/registry";
import { createFileStore } from "../storage/file-store";
import { createJobSlot } from "./jobs";
import { createGenerationsRepo } from "./repo";
import { createGenerationsService } from "./service";

const MODEL: ImageModel = { id: "m", name: "M", params: { inputs: { min: 0, max: 8 } } };

describe("lineage integrity (spec §6 Durability, AC-07)", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  it("a derived save that fails after its files moved leaves nothing half-saved, also after a restart", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: "01INT00000000000000000000A", inputs: 2 });
    const files = createFileStore(t.dataDir);
    const real = files.commitSync;
    files.commitSync = (id) => {
      real(id);
      throw new Error("SQLITE_FULL: database or disk is full");
    };
    const provider: ImageProvider = {
      id: "openrouter",
      name: "OpenRouter",
      configured: true,
      listModels: async () => [MODEL],
      generate: async () => ({
        images: [{ bytes: TINY_PNG, mediaType: "image/png", width: 4, height: 3 }],
        costUsd: 0.01,
        acceptedParams: null,
        rawRequest: {},
        rawResponse: {},
      }),
    };
    const registry = registryOf([provider]);
    const repo = createGenerationsRepo(t.db);
    const svc = createGenerationsService({
      providers: registry,
      catalog: createModelCatalog(registry),
      repo,
      files,
      jobs: createJobSlot(t.dataDir),
      costSync: { track: vi.fn(), forget: vi.fn() },
      timeoutMs: 180_000,
    });
    await svc.startGenerationChecked({
      provider: "openrouter",
      model: "m",
      prompt: "Again",
      params: { n: 1 },
      source: { id: src.id, relation: "rerun" },
      inputs: [1, 2].map((position) => ({ stored: { generationId: src.id, kind: "input", position } })),
    });
    await svc.whenIdle();
    expect(svc.getJob()).toMatchObject({ status: "failed", error: { code: "STORAGE_ERROR" } });
    expect(repo.allIds()).toEqual([src.id]);
    expect(repo.derivedOf(src.id).total).toBe(0);
    t.restart();
    expect(readdirSync(join(t.dataDir, "generations"))).toEqual([src.id]);
    expect(src.inputs.every((i) => existsSync(join(t.dataDir, i.path)))).toBe(true); // the source is untouched
  });

  it("deleting a source keeps every file of its derived generation served", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: "01INT00000000000000000000B" });
    const child = seedGeneration(t.db, t.dataDir, {
      id: "01INT00000000000000000000C",
      images: 2,
      inputs: 1,
      sourceId: src.id,
      sourceRelation: "reuse",
      sourceOutput: 1,
    });
    expect((await t.app.request(`/api/generations/${src.id}`, { method: "DELETE" })).status).toBe(204);
    for (const p of [...child.images, ...child.inputs].map((f) => f.path))
      expect((await t.app.request(`/api/files/${p}`)).status).toBe(200);
  });
});
