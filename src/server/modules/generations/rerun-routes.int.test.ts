import { afterEach, describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { seedGeneration, TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { CurrentJobResponse, Generation } from "../../../shared/generations";

const KEY = "sk-or-test-KEY";
const MODEL = "qwen/qwen-image-2.1-turbo"; // takes input images in the catalog fixture
const id = (n: number) => `01RT${String(n).padStart(22, "0")}`;

function app() {
  const fetch = fakeFetch((url) =>
    url.endsWith("/images/models")
      ? { body: fixture("openrouter/models.json") }
      : { body: fixture("openrouter/images-success.json") },
  );
  return { t: createTestApp({ openRouterApiKey: KEY }, { fetch }), fetch };
}

async function settle(t: ReturnType<typeof createTestApp>) {
  for (let i = 0; i < 200; i++) {
    const { job } = CurrentJobResponse.parse(await (await t.app.request("/api/generation-job")).json());
    if (job?.status !== "running") return job;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("job did not finish");
}

const startJson = (t: ReturnType<typeof createTestApp>, body: unknown, headers: Record<string, string> = {}) =>
  t.app.request("/api/generations", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

describe("re-run / reuse routes", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  it("starts from stored images with a plain JSON request and shows lineage on both sides", async () => {
    ({ t } = app());
    const src = seedGeneration(t.db, t.dataDir, { id: id(1), images: 2 });
    const res = await startJson(t, {
      provider: "openrouter",
      model: MODEL,
      prompt: "Make it blue",
      params: { n: 1 },
      source: { id: src.id, relation: "reuse", output: 2 },
      inputs: [{ stored: { generationId: src.id, kind: "output", position: 2 } }],
    });
    expect(res.status).toBe(202);
    const job = await settle(t);
    expect(job?.status).toBe("succeeded");

    const child = Generation.parse(await (await t.app.request(`/api/generations/${job?.generationId}`)).json());
    expect(child.source).toEqual({ id: src.id, relation: "reuse", output: 2, exists: true, prompt: src.prompt });
    expect(child.inputs).toHaveLength(1);
    expect(child.derived).toEqual({ items: [], total: 0 });
    const parent = Generation.parse(await (await t.app.request(`/api/generations/${src.id}`)).json());
    expect(parent.source).toBeNull();
    expect(parent.derived).toEqual({
      items: [{ id: child.id, relation: "reuse", output: 2, createdAt: child.createdAt, prompt: "Make it blue" }],
      total: 1,
    });

    expect((await t.app.request(`/api/generations/${src.id}`, { method: "DELETE" })).status).toBe(204);
    const after = Generation.parse(await (await t.app.request(`/api/generations/${child.id}`)).json());
    expect(after.source).toEqual({ id: src.id, relation: "reuse", output: 2, exists: false, prompt: null });
    expect((await t.app.request(after.inputs[0]?.url ?? "")).status).toBe(200);
  });

  it("keeps the order of stored references and uploads in a multipart request", async () => {
    let sent: unknown;
    const fetch = fakeFetch((url, init) => {
      if (url.endsWith("/images/models")) return { body: fixture("openrouter/models.json") };
      sent = JSON.parse(String(init.body));
      return { body: fixture("openrouter/images-success.json") };
    });
    t = createTestApp({ openRouterApiKey: KEY }, { fetch });
    const src = seedGeneration(t.db, t.dataDir, { id: id(2), inputs: 1 });
    const form = new FormData();
    form.append(
      "request",
      JSON.stringify({
        provider: "openrouter",
        model: MODEL,
        prompt: "Mix",
        params: { n: 1 },
        source: { id: src.id, relation: "rerun" },
        inputs: [{ upload: 1 }, { stored: { generationId: src.id, kind: "input", position: 1 } }],
      }),
    );
    const upload = new Uint8Array(TINY_PNG.byteLength + 3);
    upload.set(TINY_PNG);
    form.append("inputs", new File([upload], "mine.png", { type: "image/png" }));
    expect((await t.app.request("/api/generations", { method: "POST", body: form })).status).toBe(202);
    expect((await settle(t))?.status).toBe("succeeded");
    const refs = (sent as { input_references: { image_url: { url: string } }[] }).input_references;
    expect(refs.map((r) => Buffer.from(r.image_url.url.split(",")[1] ?? "", "base64").byteLength)).toEqual([
      TINY_PNG.byteLength + 3,
      TINY_PNG.byteLength,
    ]);
  });

  it("refuses crafted references with one generic message and never calls the provider", async () => {
    let fetch: ReturnType<typeof fakeFetch>;
    ({ t, fetch } = app());
    seedGeneration(t.db, t.dataDir, { id: id(3) });
    for (const stored of [
      { generationId: id(3), kind: "output", position: 9 },
      { generationId: id(97), kind: "output", position: 1 },
      { generationId: id(3), kind: "input", position: 1 },
    ]) {
      const res = await startJson(t, {
        provider: "openrouter",
        model: MODEL,
        prompt: "x",
        params: { n: 1 },
        inputs: [{ stored }],
      });
      expect(res.status).toBe(400);
      expect(ErrorResponse.parse(await res.json()).error.details).toEqual({
        fields: { "inputs.1": "Not an image stored by gen-img" },
      });
    }
    const bad = await startJson(t, {
      provider: "openrouter",
      model: MODEL,
      prompt: "x",
      params: { n: 1 },
      inputs: [{ stored: { generationId: "../../gen-img.db", kind: "output", position: 1 } }],
    });
    expect(bad.status).toBe(400);
    expect(fetch.calls.filter((c) => c.url.endsWith("/images"))).toHaveLength(0);
  });

  it("refuses a foreign page before anything is read", async () => {
    let fetch: ReturnType<typeof fakeFetch>;
    ({ t, fetch } = app());
    const src = seedGeneration(t.db, t.dataDir, { id: id(4) });
    const res = await startJson(
      t,
      {
        provider: "openrouter",
        model: MODEL,
        prompt: "x",
        params: { n: 1 },
        source: { id: src.id, relation: "rerun" },
      },
      { origin: "https://evil.example" },
    );
    expect(res.status).toBe(403);
    expect(
      (await t.app.request(`/api/generations/${src.id}`, { headers: { "sec-fetch-site": "cross-site" } })).status,
    ).toBe(403);
    expect(fetch.calls).toHaveLength(0);
  });
});
