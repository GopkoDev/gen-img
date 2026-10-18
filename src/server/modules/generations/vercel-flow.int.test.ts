import { afterEach, describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { seedGeneration, TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { CurrentJobResponse, Generation, GenerationPage } from "../../../shared/generations";
import { ModelsResponse } from "../../../shared/providers";

const VERCEL = "https://ai-gateway.vercel.sh/v1";
const OR_KEY = "sk-or-test-KEY";
const VC_KEY = "vck-test-KEY";

/** Fake provider HTTP routed by URL; the price lookup answers from `lookups` in order. */
function providersHttp(lookups: unknown[] = []) {
  return fakeFetch((url) => {
    if (url === `${VERCEL}/models`) return { body: fixture("vercel/models.json") };
    if (url === `${VERCEL}/chat/completions`) return { body: fixture("vercel/chat-image.json") };
    if (url === `${VERCEL}/images/generations`) return { body: fixture("vercel/images-generations.json") };
    if (url === `${VERCEL}/images/edits`) return { body: fixture("vercel/images-edits.json") };
    if (url.startsWith(`${VERCEL}/generation?id=`)) {
      const next = lookups.shift();
      return next === undefined ? { status: 404, body: fixture("vercel/generation-not-found.json") } : { body: next };
    }
    if (url.endsWith("/images/models")) return { body: fixture("openrouter/models.json") };
    return { body: fixture("openrouter/images-success.json") };
  });
}

/** Timers the test fires by hand, with a matching clock. */
function manualTime(start = Date.parse("2026-10-18T12:00:00.000Z")) {
  let clock = start;
  const queue: { at: number; fn: () => void }[] = [];
  return {
    now: () => clock,
    timers: {
      set: (fn: () => void, ms: number) => {
        const item = { at: clock + ms, fn };
        queue.push(item);
        return item;
      },
      clear: (h: unknown) => {
        const i = queue.indexOf(h as (typeof queue)[number]);
        if (i >= 0) queue.splice(i, 1);
      },
    },
    /** Moves the clock forward, firing due timers in order and letting their lookups settle. */
    async advance(ms: number) {
      const end = clock + ms;
      for (;;) {
        queue.sort((a, b) => a.at - b.at);
        const next = queue[0];
        if (!next || next.at > end) break;
        queue.shift();
        clock = next.at;
        next.fn();
        for (let i = 0; i < 20; i++) await Promise.resolve();
        await new Promise((r) => setTimeout(r, 1));
      }
      clock = end;
    },
  };
}

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: "POST",
  headers: { "content-type": "application/json", ...headers },
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

const chat = { provider: "vercel", model: "google/gemini-3.1-flash-image", prompt: "A red square", params: { n: 1 } };

describe("Vercel AI Gateway through the API", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  it("lists Vercel's image models with what each accepts", async () => {
    t = createTestApp({ aiGatewayApiKey: VC_KEY }, { fetch: providersHttp() });
    const { models } = ModelsResponse.parse(await (await t.app.request("/api/providers/vercel/models")).json());
    expect(models.map((m) => [m.id, m.params])).toEqual([
      ["bfl/flux-2-pro", { n: { max: 4 } }],
      ["openai/gpt-image-2", { n: { max: 4 } }],
      ["google/gemini-3.1-flash-image", { inputs: { min: 0, max: 8 } }],
    ]);
  });

  it("saves a generation with a pending cost and resolves it in the background", async () => {
    const time = manualTime();
    t = createTestApp(
      { aiGatewayApiKey: VC_KEY },
      { fetch: providersHttp([undefined, fixture("vercel/generation-lookup.json")]), ...time },
    );
    expect((await t.app.request("/api/generations", json(chat))).status).toBe(202);
    const job = await settle(t);
    const read = async () =>
      Generation.parse(await (await t.app.request(`/api/generations/${job?.generationId}`)).json());
    expect(await read()).toMatchObject({ provider: "vercel", costStatus: "pending", costMicros: null });
    const page = GenerationPage.parse(await (await t.app.request("/api/generations")).json());
    expect(page.items[0]).toMatchObject({ provider: "vercel", costStatus: "pending" });

    await time.advance(6_000); // first lookup (answer + 5 s): «not found yet»
    expect((await read()).costStatus).toBe("pending");
    await time.advance(10_000); // second lookup (answer + 15 s): the price
    expect(await read()).toMatchObject({ costStatus: "known", costMicros: 67_000 });
    expect(JSON.stringify(await read())).not.toContain(VC_KEY);
  });

  it("marks a cost unavailable after a restart once the deadline has passed", async () => {
    const time = manualTime();
    t = createTestApp({ aiGatewayApiKey: VC_KEY }, { fetch: providersHttp(), ...time });
    const g = seedGeneration(t.db, t.dataDir, {
      provider: "vercel",
      costMicros: null,
      costStatus: "pending",
      costRef: "gen_01OLD",
      createdAt: "2026-10-18T11:40:00.000Z",
    });
    t.restart(); // boot resume: overdue → one last lookup («not found») → unavailable
    await time.advance(0);
    const detail = Generation.parse(await (await t.app.request(`/api/generations/${g.id}`)).json());
    expect(detail).toMatchObject({ costStatus: "unavailable", costMicros: null });
  });

  it("sends attached images through the edit path and stores their copies", async () => {
    t = createTestApp({ aiGatewayApiKey: VC_KEY }, { fetch: providersHttp(), ...manualTime() });
    const fd = new FormData();
    fd.append("request", JSON.stringify({ ...chat, prompt: "Make it blue" }));
    fd.append("inputs", new Blob([Buffer.from(TINY_PNG)], { type: "image/png" }), "cat.png");
    expect((await t.app.request("/api/generations", { method: "POST", body: fd })).status).toBe(202);
    const job = await settle(t);
    const detail = Generation.parse(await (await t.app.request(`/api/generations/${job?.generationId}`)).json());
    expect(detail.inputs).toHaveLength(1);
    expect(detail.rawRequest).toMatchObject({ url: `${VERCEL}/images/edits` });
    expect(detail.costStatus).toBe("pending");
  });

  it("checks requests against the Vercel model's limits without calling the gateway", async () => {
    const fetch = providersHttp();
    t = createTestApp({ aiGatewayApiKey: VC_KEY }, { fetch });
    const many = await t.app.request("/api/generations", json({ ...chat, params: { n: 2 } }));
    expect(ErrorResponse.parse(await many.json()).error.details).toEqual({
      fields: { "params.n": "This model makes at most 1 image per request" },
    });
    const fd = new FormData();
    fd.append("request", JSON.stringify({ ...chat, model: "bfl/flux-2-pro" }));
    fd.append("inputs", new Blob([Buffer.from(TINY_PNG)], { type: "image/png" }), "cat.png");
    const inputs = await t.app.request("/api/generations", { method: "POST", body: fd });
    expect(ErrorResponse.parse(await inputs.json()).error.details).toEqual({
      fields: { inputs: "This model does not accept input images" },
    });
    expect(fetch.calls.filter((c) => !c.url.endsWith("/models"))).toHaveLength(0);
  });

  it("explains a missing Vercel key while OpenRouter keeps working", async () => {
    t = createTestApp({ openRouterApiKey: OR_KEY }, { fetch: providersHttp() });
    const res = await t.app.request("/api/generations", json(chat));
    expect(res.status).toBe(409);
    expect(ErrorResponse.parse(await res.json()).error).toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
      details: { provider: "vercel" },
    });
    const or = { provider: "openrouter", model: "qwen/qwen-image-2.1-turbo", prompt: "x", params: { n: 1 } };
    expect((await t.app.request("/api/generations", json(or))).status).toBe(202);
    expect(await settle(t)).toMatchObject({ status: "succeeded" });
  });

  it("refuses a foreign page that tries to spend the Vercel balance", async () => {
    const fetch = providersHttp();
    t = createTestApp({ aiGatewayApiKey: VC_KEY }, { fetch });
    const res = await t.app.request("/api/generations", json(chat, { "sec-fetch-site": "cross-site" }));
    expect(res.status).toBe(403);
    expect(fetch.calls).toHaveLength(0);
  });

  it("shows both providers' generations together, newest first", async () => {
    t = createTestApp();
    seedGeneration(t.db, t.dataDir, { id: "01MIX0000000000000000000001", provider: "openrouter" });
    seedGeneration(t.db, t.dataDir, { id: "01MIX0000000000000000000002", provider: "vercel" });
    const page = GenerationPage.parse(await (await t.app.request("/api/generations")).json());
    expect(page.items.map((g) => [g.id, g.provider])).toEqual([
      ["01MIX0000000000000000000002", "vercel"],
      ["01MIX0000000000000000000001", "openrouter"],
    ]);
  });
});
