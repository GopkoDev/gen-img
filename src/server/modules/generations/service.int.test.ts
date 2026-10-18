import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import type { ImageModel } from "../../../shared/providers";
import { createModelCatalog } from "../providers/catalog";
import { type GenerateInput, type GenerationResult, type ImageProvider, ProviderError } from "../providers/port";
import { registryOf } from "../providers/registry";
import { createFileStore } from "../storage/file-store";
import { createJobSlot } from "./jobs";
import { createGenerationsRepo } from "./repo";
import { createGenerationsService } from "./service";

const MODEL: ImageModel = { id: "test/model", name: "Test", params: { n: { max: 4 }, seed: {} } };
const png = () => ({ bytes: TINY_PNG, mediaType: "image/png" as const, width: 4, height: 3 });
const ok = (n: number, costUsd: number | null = 0.04): GenerationResult => ({
  images: Array.from({ length: n }, png),
  costUsd,
  acceptedParams: null,
  rawRequest: { method: "POST", url: "u", body: { prompt: "p" } },
  rawResponse: {
    data: Array.from({ length: n }, (_, i) => ({ b64_json: { $image: i + 1 } })),
    usage: { cost: costUsd },
  },
});

type Behaviour = (input: GenerateInput, signal: AbortSignal) => Promise<GenerationResult>;

function fakeProvider(behaviour: Behaviour, configured = true): ImageProvider & { calls: GenerateInput[] } {
  const calls: GenerateInput[] = [];
  return {
    id: "openrouter",
    name: "OpenRouter",
    configured,
    calls,
    listModels: async () => [MODEL],
    generate: (input, signal) => {
      calls.push(input);
      return behaviour(input, signal);
    },
  };
}

const body = (over: Record<string, unknown> = {}) => ({
  provider: "openrouter",
  model: "test/model",
  prompt: "A red square",
  params: { n: 1 },
  ...over,
});

describe("generations service", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  function build(
    provider: ImageProvider,
    opts: { timeoutMs?: number; failCommit?: boolean; failStage?: boolean; failSecondImage?: boolean } = {},
  ) {
    const registry = registryOf([provider]);
    const files = createFileStore(t.dataDir);
    if (opts.failCommit)
      files.commitSync = (id) => {
        createFileStore(t.dataDir).commitSync(id); // the move succeeds…
        throw new Error("disk full"); // …and something after it fails
      };
    if (opts.failStage)
      files.stage = async () => {
        throw new Error("ENOSPC: no space left on device");
      };
    if (opts.failSecondImage) {
      const real = files.stage;
      files.stage = async (id, images) => {
        await real(id, images.slice(0, 1)); // the first image lands in staging…
        throw new Error("ENOSPC: no space left on device"); // …the second does not
      };
    }
    return createGenerationsService({
      providers: registry,
      catalog: createModelCatalog(registry),
      repo: createGenerationsRepo(t.db),
      files,
      jobs: createJobSlot(t.dataDir),
      costSync: { track: () => {} },
      timeoutMs: opts.timeoutMs ?? 180_000,
    });
  }

  it("runs a generation in the background and saves it with full metadata", async () => {
    const svc = build(fakeProvider(async () => ok(2)));
    const job = svc.startGeneration(body({ params: { n: 2, seed: 7 } }));
    expect(job.status).toBe("running");
    await svc.whenIdle();

    const done = svc.getJob();
    expect(done).toMatchObject({ status: "succeeded", generationId: expect.any(String) });
    const gen = svc.get(done?.generationId ?? "");
    expect(gen).toMatchObject({
      provider: "openrouter",
      model: "test/model",
      prompt: "A red square",
      requestedParams: { n: 2, seed: 7 },
      acceptedParams: null,
      imagesRequested: 2,
      costMicros: 40000,
      costStatus: "known",
      images: [{ position: 1, width: 4, height: 3 }, { position: 2 }],
      rawResponse: {
        data: [
          { b64_json: { $file: `generations/${gen?.id}/output-1.png` } },
          { b64_json: { $file: `generations/${gen?.id}/output-2.png` } },
        ],
      },
    });
    expect(gen?.durationMs).toBeGreaterThanOrEqual(0);
    expect(existsSync(join(t.dataDir, "generations", gen?.id ?? "", "output-2.png"))).toBe(true);
  });

  it("passes input images to the provider and stores their copies with the generation", async () => {
    const MODEL_IN: ImageModel = { ...MODEL, params: { ...MODEL.params, inputs: { min: 1, max: 2 } } };
    const provider = fakeProvider(async () => ok(1));
    provider.listModels = async () => [MODEL_IN];
    const svc = build(provider);
    const files = [{ bytes: TINY_PNG, name: "cat.png" }];
    await expect(svc.startGenerationChecked(body(), [])).rejects.toMatchObject({
      details: { fields: { inputs: "This model needs at least 1 input image" } },
    });
    await svc.startGenerationChecked(body(), files);
    await svc.whenIdle();
    expect(provider.calls[0]?.inputs).toEqual([{ bytes: TINY_PNG, mediaType: "image/png" }]);
    const gen = svc.get(svc.getJob()?.generationId ?? "");
    expect(gen?.inputs).toEqual([
      {
        position: 1,
        path: `generations/${gen?.id}/input-1.png`,
        mediaType: "image/png",
        width: 4,
        height: 3,
        byteSize: TINY_PNG.byteLength,
        originalName: "cat.png",
      },
    ]);
    expect(existsSync(join(t.dataDir, "generations", gen?.id ?? "", "input-1.png"))).toBe(true);
  });

  it("keeps at most 255 characters of an attached file's name", async () => {
    const MODEL_IN: ImageModel = { ...MODEL, params: { ...MODEL.params, inputs: { min: 0, max: 2 } } };
    const provider = fakeProvider(async () => ok(1));
    provider.listModels = async () => [MODEL_IN];
    const svc = build(provider);
    await svc.startGenerationChecked(body(), [{ bytes: TINY_PNG, name: `${"x".repeat(300)}.png` }]);
    await svc.whenIdle();
    expect(svc.get(svc.getJob()?.generationId ?? "")?.inputs[0]?.originalName).toHaveLength(255);
  });

  it("leaves no input copies when storing fails", async () => {
    const MODEL_IN: ImageModel = { ...MODEL, params: { ...MODEL.params, inputs: { min: 0, max: 2 } } };
    const provider = fakeProvider(async () => ok(1));
    provider.listModels = async () => [MODEL_IN];
    const svc = build(provider, { failCommit: true });
    await svc.startGenerationChecked(body(), [{ bytes: TINY_PNG, name: "cat.png" }]);
    await svc.whenIdle();
    expect(svc.getJob()?.status).toBe("failed");
    const gens = join(t.dataDir, "generations");
    expect(existsSync(gens) ? readdirSync(gens) : []).toEqual([]);
    expect(readdirSync(join(t.dataDir, ".staging"))).toEqual([]);
  });

  it("saves a partial result and records requested vs received", async () => {
    const svc = build(fakeProvider(async () => ok(2)));
    svc.startGeneration(body({ params: { n: 4 } }));
    await svc.whenIdle();
    const gen = svc.get(svc.getJob()?.generationId ?? "");
    expect(gen).toMatchObject({ imagesRequested: 4, images: [{}, {}] });
  });

  it("marks a missing price unavailable", async () => {
    const svc = build(fakeProvider(async () => ok(1, null)));
    svc.startGeneration(body());
    await svc.whenIdle();
    expect(svc.get(svc.getJob()?.generationId ?? "")).toMatchObject({ costMicros: null, costStatus: "unavailable" });
  });

  it("refuses invalid input and unsupported parameters without calling the provider", () => {
    const provider = fakeProvider(async () => ok(1));
    const svc = build(provider);
    expect(() => svc.startGeneration(body({ prompt: " " }))).toThrow(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        details: { fields: { prompt: "Prompt must not be empty" } },
      }),
    );
    return expect(svc.startGenerationChecked(body({ params: { n: 1, aspectRatio: "1:1" } })))
      .rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        details: { fields: { "params.aspectRatio": "This model does not accept an aspect ratio" } },
      })
      .then(() => expect(provider.calls).toHaveLength(0));
  });

  it("refuses when the provider is not configured", () => {
    const svc = build(fakeProvider(async () => ok(1), false));
    expect(() => svc.startGeneration(body())).toThrow(
      expect.objectContaining({ code: "PROVIDER_NOT_CONFIGURED", status: 409 }),
    );
  });

  it("allows only one generation in flight", async () => {
    let release: (r: GenerationResult) => void = () => {};
    const provider = fakeProvider(() => new Promise((r) => (release = r)));
    const svc = build(provider);
    svc.startGeneration(body());
    expect(() => svc.startGeneration(body())).toThrow(
      expect.objectContaining({ code: "GENERATION_IN_PROGRESS", status: 409 }),
    );
    expect(() => svc.dismissJob()).toThrow(expect.objectContaining({ code: "GENERATION_IN_PROGRESS" }));
    expect(provider.calls).toHaveLength(1);
    release(ok(1));
    await svc.whenIdle();
    expect(svc.getJob()?.status).toBe("succeeded");
  });

  it("keeps the provider's reason, saves nothing, and persists the notice until dismissed", async () => {
    const svc = build(
      fakeProvider(async () => Promise.reject(new ProviderError("openrouter", 402, "Insufficient credits"))),
    );
    svc.startGeneration(body());
    await svc.whenIdle();
    const failed = {
      status: "failed",
      error: {
        code: "PROVIDER_ERROR",
        message: "Insufficient credits",
        details: { provider: "openrouter", upstreamStatus: 402 },
      },
    };
    expect(svc.getJob()).toMatchObject(failed);
    expect(svc.list({ limit: 24 }).items).toEqual([]);

    // a restarted server still shows the notice
    const again = build(fakeProvider(async () => ok(1)));
    expect(again.getJob()).toMatchObject(failed);
    again.dismissJob();
    expect(again.getJob()).toBeNull();
    expect(build(fakeProvider(async () => ok(1))).getJob()).toBeNull();
  });

  it("cancels a provider call that exceeds the timeout", async () => {
    const svc = build(
      fakeProvider(
        (_i, signal) =>
          new Promise((_, reject) =>
            signal.addEventListener("abort", () =>
              reject(new ProviderError("openrouter", null, "The provider did not answer in time")),
            ),
          ),
      ),
      { timeoutMs: 30 },
    );
    svc.startGeneration(body());
    await svc.whenIdle();
    expect(svc.getJob()).toMatchObject({
      status: "failed",
      error: { code: "PROVIDER_ERROR", message: "The provider did not answer within 0.03 s" },
    });
    expect(svc.list({ limit: 24 }).items).toEqual([]);
  });

  it.each([
    ["stage", { failStage: true }],
    ["the second image", { failSecondImage: true }],
    ["commit", { failCommit: true }],
  ] as const)("leaves no rows and no files when storing fails at %s", async (_where, opts) => {
    const svc = build(
      fakeProvider(async () => ok(2)),
      opts,
    );
    svc.startGeneration(body({ params: { n: 2 } }));
    await svc.whenIdle();
    expect(svc.getJob()).toMatchObject({
      status: "failed",
      error: { code: "STORAGE_ERROR", message: expect.stringMatching(/^The images could not be stored: /) },
    });
    expect(svc.list({ limit: 24 }).items).toEqual([]);
    const gens = join(t.dataDir, "generations");
    expect(existsSync(gens) ? readdirSync(gens) : []).toEqual([]);
    expect(readdirSync(join(t.dataDir, ".staging"))).toEqual([]);
  });
});

describe("generations service — second provider and deferred costs", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  function build(vercel: Behaviour, openrouter: Behaviour = async () => ok(1)) {
    const or = fakeProvider(openrouter);
    const vc = { ...fakeProvider(vercel), id: "vercel" as const, name: "Vercel AI Gateway" };
    const registry = registryOf([or, vc]);
    const track = vi.fn();
    const svc = createGenerationsService({
      providers: registry,
      catalog: createModelCatalog(registry),
      repo: createGenerationsRepo(t.db),
      files: createFileStore(t.dataDir),
      jobs: createJobSlot(t.dataDir),
      costSync: { track },
      timeoutMs: 180_000,
    });
    return { svc, track, vc };
  }

  it("saves a generation whose price comes later as pending and hands it to the cost resolver", async () => {
    const { svc, track } = build(async () => ({ ...ok(1, null), costRef: "gen_01REF" }));
    svc.startGeneration(body({ provider: "vercel" }));
    await svc.whenIdle();
    const gen = svc.get(svc.getJob()?.generationId ?? "");
    expect(gen).toMatchObject({ provider: "vercel", costStatus: "pending", costMicros: null, costRef: "gen_01REF" });
    expect(track).toHaveBeenCalledWith({
      id: gen?.id,
      provider: "vercel",
      costRef: "gen_01REF",
      answeredAt: Date.parse(gen?.createdAt ?? "") + (gen?.durationMs ?? 0),
    });
  });

  it("does not involve the resolver when the price is stated or will never come", async () => {
    const { svc, track } = build(async () => ok(1, null));
    svc.startGeneration(body({ provider: "vercel" }));
    await svc.whenIdle();
    expect(svc.get(svc.getJob()?.generationId ?? "")).toMatchObject({ costStatus: "unavailable", costRef: null });
    svc.startGeneration(body());
    await svc.whenIdle();
    expect(svc.get(svc.getJob()?.generationId ?? "")).toMatchObject({ costStatus: "known", costMicros: 40000 });
    expect(track).not.toHaveBeenCalled();
  });

  it("runs one generation at a time across both providers", async () => {
    let release: (r: GenerationResult) => void = () => {};
    const { svc, vc } = build(
      async () => ok(1),
      () => new Promise((r) => (release = r)),
    );
    svc.startGeneration(body());
    expect(() => svc.startGeneration(body({ provider: "vercel" }))).toThrow(
      expect.objectContaining({ code: "GENERATION_IN_PROGRESS" }),
    );
    expect(vc.calls).toHaveLength(0);
    release(ok(1));
    await svc.whenIdle();
  });
});
