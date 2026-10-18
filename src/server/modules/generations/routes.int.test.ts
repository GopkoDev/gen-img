import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { seedGeneration, TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { CurrentJobResponse, Generation, GenerationPage, JobResponse } from "../../../shared/generations";

const KEY = "sk-or-test-KEY";
const openrouter = (images: string) =>
  fakeFetch((url) =>
    url.endsWith("/images/models")
      ? { body: fixture("openrouter/models.json") }
      : { body: fixture(`openrouter/${images}.json`) },
  );

const start = (t: ReturnType<typeof createTestApp>, body: unknown) =>
  t.app.request("/api/generations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

async function settle(t: ReturnType<typeof createTestApp>) {
  for (let i = 0; i < 200; i++) {
    const { job } = CurrentJobResponse.parse(await (await t.app.request("/api/generation-job")).json());
    if (job?.status !== "running") return job;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("job did not finish");
}

const valid = {
  provider: "openrouter",
  model: "qwen/qwen-image-2.1-turbo",
  prompt: "A red square",
  params: { n: 2, aspectRatio: "16:9", seed: 7 },
};

function multipart(request: unknown, files: { bytes: Uint8Array; name: string; type?: string }[]) {
  const fd = new FormData();
  fd.append("request", JSON.stringify(request));
  for (const f of files) fd.append("inputs", new Blob([Buffer.from(f.bytes)], { type: f.type ?? "image/png" }), f.name);
  return fd;
}

describe("generations routes", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  it("starts a generation, reports the job, and serves the saved detail and its images", async () => {
    t = createTestApp({ openRouterApiKey: KEY }, { fetch: openrouter("images-success") });
    const res = await start(t, valid);
    expect(res.status).toBe(202);
    expect(JobResponse.parse(await res.json()).job.status).toBe("running");

    const job = await settle(t);
    expect(job).toMatchObject({ status: "succeeded" });
    const detail = Generation.parse(await (await t.app.request(`/api/generations/${job?.generationId}`)).json());
    expect(detail).toMatchObject({
      provider: "openrouter",
      model: valid.model,
      prompt: valid.prompt,
      requestedParams: valid.params,
      acceptedParams: null,
      imagesRequested: 2,
      costMicros: 40000,
      costStatus: "known",
      images: [
        { position: 1, mediaType: "image/png", width: 4, height: 3 },
        { position: 2, width: 3, height: 4 },
      ],
    });
    expect(JSON.stringify(detail)).not.toContain(KEY);

    const img = await t.app.request(detail.images[0]?.url ?? "");
    expect(img.status).toBe(200);
    expect(img.headers.get("content-type")).toBe("image/png");
    expect((await img.arrayBuffer()).byteLength).toBe(detail.images[0]?.byteSize);
  });

  it("returns per-field reasons and never calls the provider for invalid input", async () => {
    const fetch = openrouter("images-success");
    t = createTestApp({ openRouterApiKey: KEY }, { fetch });
    const res = await start(t, { ...valid, prompt: " ", params: { n: 9 } });
    expect(res.status).toBe(400);
    expect(ErrorResponse.parse(await res.json()).error).toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        fields: { prompt: "Prompt must not be empty", "params.n": "Number of images must be between 1 and 4" },
      },
    });
    const unsupported = await start(t, { ...valid, model: "meta/muse-image" });
    expect(ErrorResponse.parse(await unsupported.json()).error.details).toEqual({
      fields: {
        "params.n": "This model makes at most 1 image per request",
        "params.aspectRatio": "This model does not accept an aspect ratio",
        "params.seed": "This model does not accept a seed",
      },
    });
    expect((await start(t, "not json")).status).toBe(400);
    expect(fetch.calls.filter((c) => c.url.endsWith("/images"))).toHaveLength(0);
  });

  it("refuses without a key and while another generation runs", async () => {
    t = createTestApp({}, { fetch: openrouter("images-success") });
    const res = await start(t, valid);
    expect(res.status).toBe(409);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("PROVIDER_NOT_CONFIGURED");
    t.cleanup();

    t = createTestApp(
      { openRouterApiKey: KEY },
      {
        fetch: fakeFetch((url) =>
          url.endsWith("/images/models") ? { body: fixture("openrouter/models.json") } : "hang",
        ),
        generationTimeoutMs: 100,
      },
    );
    expect((await start(t, valid)).status).toBe(202);
    const second = await start(t, valid);
    expect(second.status).toBe(409);
    expect(ErrorResponse.parse(await second.json()).error.code).toBe("GENERATION_IN_PROGRESS");
    expect((await t.app.request("/api/generation-job", { method: "DELETE" })).status).toBe(409);
    expect(await settle(t)).toMatchObject({
      status: "failed",
      error: { message: "The provider did not answer within 0.1 s" },
    });
    expect((await t.app.request("/api/generation-job", { method: "DELETE" })).status).toBe(204);
    expect(CurrentJobResponse.parse(await (await t.app.request("/api/generation-job")).json())).toEqual({ job: null });
  });

  it("starts a generation with input images and stores their copies in attach order", async () => {
    const fetch = openrouter("images-success");
    t = createTestApp({ openRouterApiKey: KEY }, { fetch });
    const res = await t.app.request("/api/generations", {
      method: "POST",
      body: multipart(valid, [
        { bytes: TINY_PNG, name: "cat.png" },
        { bytes: TINY_PNG, name: "sky.png" },
      ]),
    });
    expect(res.status).toBe(202);
    const job = await settle(t);
    expect(job?.status).toBe("succeeded");

    const sent = JSON.parse(String(fetch.calls.find((c) => c.url.endsWith("/images"))?.init.body));
    expect(sent.input_references).toHaveLength(2);

    const detail = Generation.parse(await (await t.app.request(`/api/generations/${job?.generationId}`)).json());
    expect(detail.inputs.map((i) => [i.position, i.originalName, i.width, i.height])).toEqual([
      [1, "cat.png", 4, 3],
      [2, "sky.png", 4, 3],
    ]);
    expect(JSON.stringify(detail.rawRequest)).not.toContain("base64,");
    expect(JSON.stringify(detail.rawRequest)).toContain(`generations/${detail.id}/input-1.png`);
    const file = await t.app.request(detail.inputs[1]?.url ?? "");
    expect(file.status).toBe(200);

    const page = GenerationPage.parse(await (await t.app.request("/api/generations")).json());
    expect(page.items[0]?.inputsCount).toBe(2);
  });

  it("refuses bad files and too many inputs without calling the provider", async () => {
    const fetch = openrouter("images-success");
    t = createTestApp({ openRouterApiKey: KEY }, { fetch });
    const bad = await t.app.request("/api/generations", {
      method: "POST",
      body: multipart(valid, [
        { bytes: TINY_PNG, name: "ok.png" },
        { bytes: new TextEncoder().encode("heic?"), name: "photo.heic", type: "image/heic" },
      ]),
    });
    expect(bad.status).toBe(400);
    expect(ErrorResponse.parse(await bad.json()).error.details).toEqual({
      fields: { "inputs.2": "photo.heic — not a supported image" },
    });

    const many = await t.app.request("/api/generations", {
      method: "POST",
      body: multipart(
        valid,
        Array.from({ length: 5 }, (_, i) => ({ bytes: TINY_PNG, name: `${i}.png` })),
      ),
    });
    expect(ErrorResponse.parse(await many.json()).error.details).toEqual({
      fields: { inputs: "This model takes at most 4 input images" },
    });

    const textOnly = await t.app.request("/api/generations", {
      method: "POST",
      body: multipart({ ...valid, model: "meta/muse-image", params: { n: 1 } }, [{ bytes: TINY_PNG, name: "a.png" }]),
    });
    expect(ErrorResponse.parse(await textOnly.json()).error.details).toEqual({
      fields: { inputs: "This model does not accept input images" },
    });

    const noRequest = new FormData();
    noRequest.append("inputs", new Blob([Buffer.from(TINY_PNG)], { type: "image/png" }), "a.png");
    expect((await t.app.request("/api/generations", { method: "POST", body: noRequest })).status).toBe(400);
    expect(fetch.calls.filter((c) => c.url.endsWith("/images"))).toHaveLength(0);
  });

  it("refuses more than 8 input images even when the model is unknown", async () => {
    t = createTestApp({}, { fetch: openrouter("images-success") }); // no key → no catalog to check against
    const res = await t.app.request("/api/generations", {
      method: "POST",
      body: multipart(
        valid,
        Array.from({ length: 9 }, (_, i) => ({ bytes: TINY_PNG, name: `${i}.png` })),
      ),
    });
    expect(res.status).toBe(400);
    expect(ErrorResponse.parse(await res.json()).error.details).toEqual({
      fields: { inputs: "At most 8 input images per generation" },
    });
  });

  it("refuses a body over the upload limit", async () => {
    t = createTestApp({ openRouterApiKey: KEY }, { fetch: openrouter("images-success") });
    const huge = new Uint8Array(9 * 10 * 1024 * 1024);
    const res = await t.app.request("/api/generations", {
      method: "POST",
      body: multipart(valid, [{ bytes: huge, name: "huge.png" }]),
    });
    expect(res.status).toBe(400);
    expect(ErrorResponse.parse(await res.json()).error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "The request is too large — at most 8 input images of 10 MB each",
    });
  });

  it("pages the gallery newest first and shows an empty gallery", async () => {
    t = createTestApp();
    expect(GenerationPage.parse(await (await t.app.request("/api/generations")).json())).toEqual({
      items: [],
      nextCursor: null,
    });
    for (let i = 0; i < 26; i++) seedGeneration(t.db, t.dataDir, { id: `01ROUTE${String(i).padStart(19, "0")}` });
    const page = GenerationPage.parse(await (await t.app.request("/api/generations")).json());
    expect(page.items).toHaveLength(24);
    expect(page.items[0]).toMatchObject({
      id: "01ROUTE0000000000000000025",
      provider: "openrouter",
      imagesReceived: 1,
    });
    expect(page.items[0]?.thumbnail.url).toBe("/api/files/generations/01ROUTE0000000000000000025/output-1.png");
    const next = GenerationPage.parse(
      await (await t.app.request(`/api/generations?cursor=${page.nextCursor}&limit=24`)).json(),
    );
    expect(next.items).toHaveLength(2);
    for (const q of ["limit=0", "limit=101", "limit=abc", "cursor=../x"])
      expect((await t.app.request(`/api/generations?${q}`)).status).toBe(400);
  });

  it("serves only recorded images and hides everything else", async () => {
    t = createTestApp();
    const g = seedGeneration(t.db, t.dataDir);
    mkdirSync(join(t.dataDir, "generations", "UNRECORDED"), { recursive: true });
    writeFileSync(join(t.dataDir, "generations", "UNRECORDED", "output-1.png"), "x");
    expect((await t.app.request(`/api/files/${g.images[0]?.path}`)).status).toBe(200);
    for (const p of [
      "generations/UNRECORDED/output-1.png",
      "gen-img.db",
      "generations/../gen-img.db",
      "%2e%2e/%2e%2e/etc/passwd",
    ])
      expect((await t.app.request(`/api/files/${p}`)).status).toBe(404);
    expect((await t.app.request("/api/generations/NOPE")).status).toBe(404);
  });

  it("cleans up leftovers of an interrupted save when the app starts", async () => {
    t = createTestApp();
    const g = seedGeneration(t.db, t.dataDir);
    mkdirSync(join(t.dataDir, ".staging", "HALF"), { recursive: true });
    mkdirSync(join(t.dataDir, "generations", "ORPHAN"), { recursive: true });
    t.restart();
    expect(existsSync(join(t.dataDir, ".staging", "HALF"))).toBe(false);
    expect(existsSync(join(t.dataDir, "generations", "ORPHAN"))).toBe(false);
    expect(existsSync(join(t.dataDir, g.images[0]?.path ?? ""))).toBe(true);
  });
});
