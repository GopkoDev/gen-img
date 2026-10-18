import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { seedGeneration, TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import type { ImageModel } from "../../../shared/providers";
import { createModelCatalog } from "../providers/catalog";
import type { GenerateInput, GenerationResult, ImageProvider } from "../providers/port";
import { registryOf } from "../providers/registry";
import { createFileStore } from "../storage/file-store";
import { createJobSlot } from "./jobs";
import { createGenerationsRepo } from "./repo";
import { createGenerationsService, type InputFile } from "./service";

const MODEL: ImageModel = {
  id: "test/editor",
  name: "Editor",
  params: { n: { max: 4 }, seed: {}, inputs: { min: 0, max: 8 } },
};
const result = (): GenerationResult => ({
  images: [{ bytes: TINY_PNG, mediaType: "image/png", width: 4, height: 3 }],
  costUsd: 0.01,
  acceptedParams: null,
  rawRequest: {},
  rawResponse: {},
});
const id = (n: number) => `01RR${String(n).padStart(22, "0")}`;

describe("generations service — re-run and reuse from stored images", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  function build(
    generate: ImageProvider["generate"] = async () => result(),
    files: ReturnType<typeof createFileStore> = createFileStore(t.dataDir),
  ) {
    const calls: GenerateInput[] = [];
    const provider: ImageProvider = {
      id: "openrouter",
      name: "OpenRouter",
      configured: true,
      listModels: async () => [MODEL],
      generate: (input, signal) => {
        calls.push(input);
        return generate(input, signal);
      },
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
    return { svc, calls, repo };
  }

  const body = (over: Record<string, unknown> = {}) => ({
    provider: "openrouter",
    model: MODEL.id,
    prompt: "Again",
    params: { n: 1 },
    ...over,
  });
  const stored = (generationId: string, kind: "input" | "output", position: number) => ({
    stored: { generationId, kind, position },
  });

  it("re-runs with the stored inputs in order, saves own copies and records the source", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(1), inputs: 2 });
    writeFileSync(join(t.dataDir, src.inputs[1]?.path ?? ""), Buffer.concat([Buffer.from(TINY_PNG), Buffer.from([1])])); // distinguishable bytes
    const { svc, calls, repo } = build();
    await svc.startGenerationChecked(
      body({
        source: { id: src.id, relation: "rerun" },
        inputs: [stored(src.id, "input", 2), stored(src.id, "input", 1)],
      }),
    );
    await svc.whenIdle();
    const job = svc.getJob();
    expect(job?.status).toBe("succeeded");
    expect(calls[0]?.inputs?.map((i) => i.bytes.byteLength)).toEqual([TINY_PNG.byteLength + 1, TINY_PNG.byteLength]);
    const child = repo.get(job?.generationId ?? "");
    expect(child).toMatchObject({ sourceId: src.id, sourceRelation: "rerun", sourceOutput: null });
    expect(child?.inputs.map((i) => i.path)).toEqual([
      `generations/${child?.id}/input-1.png`,
      `generations/${child?.id}/input-2.png`,
    ]);
    expect(child?.inputs[1]?.originalName).toBe("cat.png");
    expect(readFileSync(join(t.dataDir, child?.inputs[0]?.path ?? "")).byteLength).toBe(TINY_PNG.byteLength + 1);
    expect(repo.derivedOf(src.id).total).toBe(1);
  });

  it("reuses one output and mixes it with an uploaded file in the requested order", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(2), images: 2 });
    const { svc, calls, repo } = build();
    const upload: InputFile = { bytes: TINY_PNG, name: "mine.png" };
    await svc.startGenerationChecked(
      body({
        source: { id: src.id, relation: "reuse", output: 2 },
        inputs: [{ upload: 1 }, stored(src.id, "output", 2)],
      }),
      [upload],
    );
    await svc.whenIdle();
    const child = repo.get(svc.getJob()?.generationId ?? "");
    expect(calls[0]?.inputs).toHaveLength(2);
    expect(child).toMatchObject({ sourceId: src.id, sourceRelation: "reuse", sourceOutput: 2 });
    expect(child?.inputs.map((i) => i.originalName)).toEqual(["mine.png", "output-2.png"]);
  });

  it("refuses a deleted source and sends nothing", async () => {
    const { svc, calls } = build();
    await expect(svc.startGenerationChecked(body({ source: { id: id(99), relation: "rerun" } }))).rejects.toMatchObject(
      {
        code: "VALIDATION_ERROR",
        details: { fields: { source: "The source generation no longer exists" } },
      },
    );
    expect(calls).toHaveLength(0);
  });

  it("answers every reference that is not a recorded image with the same message", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(3), images: 1, inputs: 1 });
    const { svc, calls } = build();
    for (const ref of [stored(id(98), "output", 1), stored(src.id, "output", 2), stored(src.id, "input", 5)]) {
      await expect(svc.startGenerationChecked(body({ inputs: [ref] }))).rejects.toMatchObject({
        details: { fields: { "inputs.1": "Not an image stored by Ukiyo" } },
      });
    }
    // a recorded image whose file vanished means its generation is being deleted (sad §11) — say so
    const { rmSync } = await import("node:fs");
    rmSync(join(t.dataDir, src.images[0]?.path ?? ""));
    await expect(svc.startGenerationChecked(body({ inputs: [stored(src.id, "output", 1)] }))).rejects.toMatchObject({
      details: { fields: { "inputs.1": "The source generation no longer exists" } },
    });
    expect(calls).toHaveLength(0);
  });

  it("refuses an output that can't be an input (larger than 10 MB) without reading it", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(4) });
    const big = new Uint8Array(11 * 1024 * 1024);
    big.set(TINY_PNG);
    writeFileSync(join(t.dataDir, src.images[0]?.path ?? ""), big);
    const files = createFileStore(t.dataDir);
    const read = vi.spyOn(files, "readRecorded");
    const { svc, calls } = build(undefined, files);
    await expect(svc.startGenerationChecked(body({ inputs: [stored(src.id, "output", 1)] }))).rejects.toMatchObject({
      details: { fields: { "inputs.1": expect.stringMatching(/larger than 10 MB/) } },
    });
    expect(read).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
  });

  it("answers a stored row with an impossible path as an ordinary miss, not a server error", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(6), images: 1 });
    t.db.prepare("UPDATE generation_images SET path = '../outside.png' WHERE generation_id = ?").run(src.id);
    const { svc, calls } = build();
    await expect(svc.startGenerationChecked(body({ inputs: [stored(src.id, "output", 1)] }))).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
    expect(calls).toHaveLength(0);
  });

  it("refuses a reuse record that names an output the source doesn't have", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(5), images: 1 });
    const { svc, calls } = build();
    await expect(
      svc.startGenerationChecked(
        body({ source: { id: src.id, relation: "reuse", output: 9 }, inputs: [stored(src.id, "output", 1)] }),
      ),
    ).rejects.toMatchObject({ details: { fields: { source: "Output 9 doesn't exist in the source generation" } } });
    expect(calls).toHaveLength(0);
  });

  it("requires every uploaded file to be used exactly once when inputs are listed", async () => {
    const { svc } = build();
    const f: InputFile = { bytes: TINY_PNG, name: "a.png" };
    for (const [inputs, files] of [
      [[{ upload: 1 }, { upload: 1 }], [f]],
      [[{ upload: 2 }], [f]],
      [[], [f]],
    ] as const)
      await expect(svc.startGenerationChecked(body({ inputs }), [...files])).rejects.toMatchObject({
        details: { fields: { inputs: "Every attached file must be used once" } },
      });
  });

  it("refuses while a generation runs, before reading stored files", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(5) });
    let release: (r: GenerationResult) => void = () => {};
    const { svc, calls } = build(() => new Promise((r) => (release = r)));
    await svc.startGenerationChecked(body());
    await expect(
      svc.startGenerationChecked(
        body({ source: { id: src.id, relation: "reuse", output: 1 }, inputs: [stored(src.id, "output", 1)] }),
      ),
    ).rejects.toMatchObject({ code: "GENERATION_IN_PROGRESS" });
    expect(calls).toHaveLength(1);
    release(result());
    await svc.whenIdle();
  });

  it("keeps a derived generation intact when the source is deleted during generation", async () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(6), inputs: 1 });
    let release: (r: GenerationResult) => void = () => {};
    const { svc, repo } = build(() => new Promise((r) => (release = r)));
    await svc.startGenerationChecked(
      body({ source: { id: src.id, relation: "rerun" }, inputs: [stored(src.id, "input", 1)] }),
    );
    svc.deleteGeneration(src.id);
    release(result());
    await svc.whenIdle();
    const child = repo.get(svc.getJob()?.generationId ?? "");
    expect(child).toMatchObject({ sourceId: src.id, inputs: [expect.objectContaining({ position: 1 })] });
    expect(repo.exists(src.id)).toBe(false);
  });
});
