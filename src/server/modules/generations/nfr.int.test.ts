import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";

// curate-gallery spec §6 NFRs, measured in-process (server time only).
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] ?? Number.NaN;

async function timed(n: number, fn: (i: number) => Promise<unknown>) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await fn(i);
    out.push(performance.now() - t0);
  }
  return out;
}

const json = (method: string, body: unknown) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("curate-gallery NFRs", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  it("comment/tag saves ≤ 100 ms p95; gallery page ≤ 300 ms p95 with 1 000 generations × 10 tags + comment", async () => {
    t = createTestApp();
    const tags = Array.from({ length: 10 }, (_, i) => `tag ${i}`);
    t.db.transaction(() => {
      for (let i = 0; i < 1000; i++)
        seedGeneration(t.db, t.dataDir, { id: `01CUR${String(i).padStart(21, "0")}`, tags, comment: "A note" });
    })();
    const id = "01CUR000000000000000000999";
    const saves = await timed(20, async (i) => {
      const res =
        i % 2
          ? await t.app.request(`/api/generations/${id}/comment`, json("PUT", { body: `note ${i}` }))
          : await t.app.request(`/api/generations/${id}/tags/${encodeURIComponent("tag 0")}`, { method: "DELETE" });
      expect(res.status).toBe(200);
    });
    const page = await timed(20, async () =>
      expect((await t.app.request("/api/generations?limit=24")).status).toBe(200),
    );
    expect(p95(saves)).toBeLessThanOrEqual(100);
    expect(p95(page)).toBeLessThanOrEqual(300);
  });

  it("deletes a generation with 4 outputs + 8 input copies ≤ 300 ms p95 and its files are gone", async () => {
    t = createTestApp();
    const ids = Array.from(
      { length: 20 },
      (_, i) =>
        seedGeneration(t.db, t.dataDir, {
          id: `01DEL${String(i).padStart(21, "0")}`,
          images: 4,
          inputs: 8,
          tags: ["x"],
          comment: "y",
        }).id,
    );
    const runs = await timed(20, async (i) =>
      expect((await t.app.request(`/api/generations/${ids[i]}`, { method: "DELETE" })).status).toBe(204),
    );
    expect(p95(runs)).toBeLessThanOrEqual(300);
    expect(readdirSync(join(t.dataDir, "generations"))).toEqual([]);
    expect(readdirSync(join(t.dataDir, ".staging"))).toEqual([]);
  });

  it("a crash between commit and purge leaves nothing behind after restart", () => {
    t = createTestApp();
    const keep = seedGeneration(t.db, t.dataDir);
    const trash = join(t.dataDir, ".staging", "01CRASHED.deleted");
    mkdirSync(trash, { recursive: true });
    writeFileSync(join(trash, "output-1.png"), "x");
    t.restart();
    expect(existsSync(trash)).toBe(false);
    expect(existsSync(join(t.dataDir, keep.images[0]?.path ?? ""))).toBe(true);
  });
});

describe("rerun-and-reuse NFRs", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  it("detail with lineage ≤ 150 ms p95 with 1 000 generations and 50 derived from the opened one", async () => {
    t = createTestApp();
    const src = "01NFRL00000000000000000000";
    t.db.transaction(() => {
      seedGeneration(t.db, t.dataDir, { id: src });
      for (let i = 0; i < 999; i++)
        seedGeneration(t.db, t.dataDir, {
          id: `01NFRM${String(i).padStart(20, "0")}`,
          ...(i < 50 ? { sourceId: src, sourceRelation: "rerun" as const } : {}),
        });
    })();
    const runs = await timed(20, async () => expect((await t.app.request(`/api/generations/${src}`)).status).toBe(200));
    expect(p95(runs)).toBeLessThanOrEqual(150);
  });

  it("server work before the provider call ≤ 300 ms p95 for 8 stored input images of ≤ 10 MB each", async () => {
    let sentAt = 0;
    const models = {
      data: [
        {
          id: "x/editor",
          name: "Editor",
          architecture: { output_modalities: ["image"] },
          supported_parameters: { input_references: { type: "range", min: 0, max: 8 } },
        },
      ],
    };
    const { fakeFetch } = await import("../../../../tests/helpers/fake-fetch");
    const fetch = fakeFetch((url) => {
      if (url.endsWith("/images/models")) return { body: models };
      sentAt = performance.now();
      return { status: 503, body: { error: { code: 503, message: "stub" } } };
    });
    t = createTestApp({ openRouterApiKey: "k" }, { fetch });
    const src = seedGeneration(t.db, t.dataDir, { id: "01NFRS00000000000000000000", inputs: 8 });
    const big = new Uint8Array(10 * 1024 * 1024 - 1024);
    big.set((await import("../../../../tests/helpers/generations")).TINY_PNG);
    for (const i of src.inputs) writeFileSync(join(t.dataDir, i.path), big);
    await t.app.request("/api/providers/openrouter/models"); // warm the catalog cache, as a real panel does
    const body = {
      provider: "openrouter",
      model: "x/editor",
      prompt: "Again",
      params: { n: 1 },
      inputs: src.inputs.map((i) => ({ stored: { generationId: src.id, kind: "input", position: i.position } })),
    };
    const runs: number[] = [];
    // Run 0 warms the file cache and JIT and is not measured; 20 measured runs follow.
    for (let r = 0; r <= 20; r++) {
      const t0 = performance.now();
      expect((await t.app.request("/api/generations", json("POST", body))).status).toBe(202);
      for (let w = 0; w < 400 && sentAt < t0; w++) await new Promise((res) => setTimeout(res, 1));
      if (r > 0) runs.push(sentAt - t0);
      for (let w = 0; w < 400; w++) {
        const job = (await (await t.app.request("/api/generation-job")).json()) as { job: { status: string } | null };
        if (job.job?.status !== "running") break;
        await new Promise((res) => setTimeout(res, 2));
      }
    }
    expect(p95(runs)).toBeLessThanOrEqual(300);
  }, 60_000); // 21 × (80 MB read + base64) — well past Vitest's 5 s default
});
