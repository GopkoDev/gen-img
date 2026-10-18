import { afterEach, describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../tests/helpers/fake-fetch";
import { seedGeneration, TINY_PNG } from "../../tests/helpers/generations";
import { createTestApp } from "../../tests/helpers/test-app";
import { CurrentJobResponse } from "../shared/generations";

// Spec §6 NFRs, measured in-process (server time only).
const p95 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.ceil(xs.length * 0.95) - 1] ?? Number.NaN;

async function timed(n: number, fn: () => Promise<unknown>) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await fn();
    out.push(performance.now() - t0);
  }
  return out;
}

describe("NFRs", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  it("gallery first page ≤ 300 ms p95 and detail ≤ 150 ms p95 with 1 000 generations", async () => {
    t = createTestApp();
    let last = "";
    t.db.transaction(() => {
      for (let i = 0; i < 1000; i++)
        last = seedGeneration(t.db, t.dataDir, { id: `01NFR${String(i).padStart(21, "0")}`, images: 2 }).id;
    })();
    const page = await timed(20, async () =>
      expect((await t.app.request("/api/generations?limit=24")).status).toBe(200),
    );
    const detail = await timed(20, async () =>
      expect((await t.app.request(`/api/generations/${last}`)).status).toBe(200),
    );
    expect(p95(page)).toBeLessThanOrEqual(300);
    expect(p95(detail)).toBeLessThanOrEqual(150);
  });

  it("local overhead ≤ 500 ms p95 for 4 × 5 MB images, and the stored exchange holds no key and no image payload", async () => {
    const KEY = "sk-or-test-KEY";
    const big = new Uint8Array(5 * 1024 * 1024);
    big.set(TINY_PNG); // a valid PNG header padded to 5 MB
    const b64 = Buffer.from(big).toString("base64");
    const answer = {
      created: 1,
      data: Array.from({ length: 4 }, () => ({ b64_json: b64, media_type: "image/png" })),
      usage: { cost: 0.16 },
    };
    t = createTestApp(
      { openRouterApiKey: KEY },
      {
        fetch: fakeFetch((url) =>
          url.endsWith("/images/models") ? { body: fixture("openrouter/models.json") } : { body: answer },
        ),
      },
    );
    const body = JSON.stringify({
      provider: "openrouter",
      model: "qwen/qwen-image-2.1-turbo",
      prompt: "Big",
      params: { n: 4 },
    });

    const runs = await timed(5, async () => {
      const res = await t.app.request("/api/generations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      });
      expect(res.status).toBe(202);
      for (;;) {
        const { job } = CurrentJobResponse.parse(await (await t.app.request("/api/generation-job")).json());
        if (job?.status !== "running") {
          expect(job?.status).toBe("succeeded");
          break;
        }
        await new Promise((r) => setTimeout(r, 2));
      }
    });
    expect(p95(runs)).toBeLessThanOrEqual(500);

    const rows = t.db.prepare("SELECT raw_request || raw_response AS raw FROM generations").pluck().all() as string[];
    expect(rows).toHaveLength(5);
    for (const raw of rows) {
      expect(raw).not.toContain(KEY);
      expect(raw).not.toContain(b64.slice(0, 64));
      expect(raw.length).toBeLessThan(2000);
    }
  });
});
