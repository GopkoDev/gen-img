import { afterEach, describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { ModelsResponse, ProvidersResponse } from "../../../shared/providers";

describe("providers routes", () => {
  let t: ReturnType<typeof createTestApp> | undefined;
  afterEach(() => t?.cleanup());

  it("lists providers with their configured flag", async () => {
    t = createTestApp({ openRouterApiKey: "sk-or-test-KEY" });
    const res = await t.app.request("/api/providers");
    expect(ProvidersResponse.parse(await res.json())).toEqual({
      providers: [{ id: "openrouter", name: "OpenRouter", configured: true }],
    });
    const bare = createTestApp();
    const body = ProvidersResponse.parse(await (await bare.app.request("/api/providers")).json());
    expect(body.providers[0]?.configured).toBe(false);
    bare.cleanup();
  });

  it("serves the model catalog and caches it for 10 minutes", async () => {
    let clock = 1_000_000;
    const fetch = fakeFetch(() => ({ body: fixture("openrouter/models.json") }));
    t = createTestApp({ openRouterApiKey: "k" }, { fetch, now: () => clock });

    const first = ModelsResponse.parse(await (await t.app.request("/api/providers/openrouter/models")).json());
    expect(first.models.map((m) => m.id)).toEqual([
      "qwen/qwen-image-2.1-turbo",
      "recraft/recraft-v4.1-flash",
      "meta/muse-image",
    ]);
    expect(first.fetchedAt).toBe(new Date(1_000_000).toISOString());

    clock += 9 * 60 * 1000;
    await t.app.request("/api/providers/openrouter/models");
    expect(fetch.calls).toHaveLength(1);

    clock += 2 * 60 * 1000;
    await t.app.request("/api/providers/openrouter/models");
    expect(fetch.calls).toHaveLength(2);
  });

  it("explains a missing key, an unknown provider and a catalog failure", async () => {
    t = createTestApp({}, { fetch: fakeFetch(() => ({ body: {} })) });
    const notConfigured = await t.app.request("/api/providers/openrouter/models");
    expect(notConfigured.status).toBe(409);
    expect(ErrorResponse.parse(await notConfigured.json()).error).toMatchObject({
      code: "PROVIDER_NOT_CONFIGURED",
      details: { provider: "openrouter" },
    });
    expect((await t.app.request("/api/providers/nope/models")).status).toBe(404);
    t.cleanup();

    t = createTestApp({ openRouterApiKey: "k" }, { fetch: fakeFetch(() => "network-error") });
    const down = await t.app.request("/api/providers/openrouter/models");
    expect(down.status).toBe(502);
    expect(ErrorResponse.parse(await down.json()).error).toMatchObject({
      code: "PROVIDER_ERROR",
      details: { provider: "openrouter", upstreamStatus: null },
    });
  });
});
