import { chmodSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedGeneration, TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { createModelCatalog } from "../providers/catalog";
import type { GenerationResult, ImageProvider } from "../providers/port";
import { registryOf } from "../providers/registry";
import { createFileStore } from "../storage/file-store";
import { createJobSlot } from "./jobs";
import { createGenerationsRepo } from "./repo";
import { createGenerationsService } from "./service";

const result = (): GenerationResult => ({
  images: [{ bytes: TINY_PNG, mediaType: "image/png", width: 4, height: 3 }],
  costUsd: 0.01,
  acceptedParams: null,
  rawRequest: {},
  rawResponse: {},
});

describe("generations service — curation and deletion", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => {
    chmodSync(join(t.dataDir, "generations"), 0o755);
    t.cleanup();
  });

  function build(generate: ImageProvider["generate"] = async () => result()) {
    const provider: ImageProvider = {
      id: "openrouter",
      name: "OpenRouter",
      configured: true,
      listModels: async () => [],
      generate,
    };
    const registry = registryOf([provider]);
    const jobs = createJobSlot(t.dataDir);
    const costSync = { track: vi.fn(), forget: vi.fn() };
    const svc = createGenerationsService({
      providers: registry,
      catalog: createModelCatalog(registry),
      repo: createGenerationsRepo(t.db),
      files: createFileStore(t.dataDir),
      jobs,
      costSync,
      timeoutMs: 180_000,
    });
    return { svc, jobs, costSync };
  }

  it("saves, replaces and removes the comment; explains limits and missing generations", () => {
    const g = seedGeneration(t.db, t.dataDir);
    const { svc } = build();
    expect(svc.setComment(g.id, { body: "Keep\nthis" })).toMatchObject({ comment: { body: "Keep\nthis" } });
    expect(svc.setComment(g.id, { body: "  " })).toEqual({ comment: null });
    expect(() => svc.setComment(g.id, { body: "x".repeat(2001) })).toThrow(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        details: { fields: { body: "Comment must be at most 2 000 characters" } },
      }),
    );
    expect(() => svc.setComment("GONE", { body: "x" })).toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("adds normalized tags, keeps duplicates out, refuses the 11th and bad text, removes one", () => {
    const g = seedGeneration(t.db, t.dataDir);
    const { svc } = build();
    expect(svc.addTag(g.id, { tag: "  Neon   City " })).toEqual({ tags: ["neon city"] });
    expect(svc.addTag(g.id, { tag: "NEON CITY" })).toEqual({ tags: ["neon city"] });
    expect(() => svc.addTag(g.id, { tag: "🐱" })).toThrow(expect.objectContaining({ code: "VALIDATION_ERROR" }));
    for (let i = 2; i <= 10; i++) svc.addTag(g.id, { tag: `t${i}` });
    expect(() => svc.addTag(g.id, { tag: "eleven" })).toThrow(
      expect.objectContaining({ details: { fields: { tag: "A generation can have at most 10 tags" } } }),
    );
    expect(svc.removeTag(g.id, "Neon City").tags).not.toContain("neon city");
    expect(() => svc.addTag("GONE", { tag: "x" })).toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
    expect(() => svc.removeTag("GONE", "x")).toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("deletes a generation with all its files, cancels its cost lookup and forgets it as the latest result", async () => {
    const { svc, jobs, costSync } = build();
    svc.startGeneration({ provider: "openrouter", model: "m", prompt: "p", params: { n: 1 } });
    await svc.whenIdle();
    const id = jobs.current()?.generationId ?? "";
    expect(existsSync(join(t.dataDir, "generations", id))).toBe(true);

    svc.deleteGeneration(id);
    expect(svc.get(id)).toBeUndefined();
    expect(existsSync(join(t.dataDir, "generations", id))).toBe(false);
    expect(readdirSync(join(t.dataDir, ".staging"))).toEqual([]); // purged, not just moved
    expect(costSync.forget).toHaveBeenCalledWith(id);
    expect(jobs.current()).toBeNull();
    expect(() => svc.deleteGeneration(id)).toThrow(expect.objectContaining({ code: "NOT_FOUND" }));
  });

  it("keeps the generation fully intact when its files can't be moved", () => {
    const g = seedGeneration(t.db, t.dataDir, { tags: ["keep"], comment: "still here" });
    const { svc } = build();
    chmodSync(join(t.dataDir, "generations"), 0o555);
    expect(() => svc.deleteGeneration(g.id)).toThrow(
      expect.objectContaining({
        code: "STORAGE_ERROR",
        message: expect.stringMatching(/^The generation could not be deleted: /),
      }),
    );
    expect(svc.get(g.id)).toMatchObject({ tags: ["keep"], comment: { body: "still here" } });
    expect(existsSync(join(t.dataDir, g.images[0]?.path ?? ""))).toBe(true);
  });

  it("does not disturb a running generation when another one is deleted", async () => {
    const old = seedGeneration(t.db, t.dataDir);
    let release: (r: GenerationResult) => void = () => {};
    const { svc, jobs } = build(() => new Promise((r) => (release = r)));
    svc.startGeneration({ provider: "openrouter", model: "m", prompt: "p", params: { n: 1 } });
    svc.deleteGeneration(old.id);
    expect(jobs.current()?.status).toBe("running");
    release(result());
    await svc.whenIdle();
    expect(jobs.current()).toMatchObject({ status: "succeeded" });
    expect(svc.get(jobs.current()?.generationId ?? "")).toBeDefined();
  });
});
