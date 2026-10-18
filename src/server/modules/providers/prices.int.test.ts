import { afterEach, describe, expect, it } from "vitest";
import { type FakeReply, fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { PriceResponse } from "../../../shared/pricing";

const KEY = "sk-or-test-KEY";
const QWEN = "qwen/qwen-image-2.1-turbo";

function openrouter(endpoints: () => FakeReply) {
  return fakeFetch((url) =>
    url.endsWith("/images/models") ? { body: fixture("openrouter/models.json") } : endpoints(),
  );
}
const priceCalls = (f: ReturnType<typeof fakeFetch>) => f.calls.filter((c) => c.url.endsWith("/endpoints"));

describe("model price route", () => {
  let t: ReturnType<typeof createTestApp> | undefined;
  afterEach(() => t?.cleanup());

  it("answers the published price and asks the provider at most once per model per 10 minutes", async () => {
    let clock = 1_000_000;
    const fetch = openrouter(() => ({ body: fixture("openrouter/endpoints/qwen_qwen-image-2.1-turbo.json") }));
    t = createTestApp({ openRouterApiKey: KEY }, { fetch, now: () => clock });
    const get = () => t?.app.request(`/api/providers/openrouter/price?model=${encodeURIComponent(QWEN)}`);

    const first = await get();
    expect(first?.status).toBe(200);
    expect(PriceResponse.parse(await first?.json())).toEqual({
      price: { kind: "per-image", output: { minUsd: 0.0184, maxUsd: 0.0184 }, input: { minUsd: 0, maxUsd: 0 } },
      fetchedAt: new Date(1_000_000).toISOString(),
    });
    clock += 9 * 60 * 1000;
    await get();
    expect(priceCalls(fetch)).toHaveLength(1);
    clock += 2 * 60 * 1000;
    await get();
    expect(priceCalls(fetch)).toHaveLength(2);
    for (const c of priceCalls(fetch)) expect(new Headers(c.init.headers).get("authorization")).toBeNull();
  });

  it("reports a failed lookup without caching it", async () => {
    let fail = true;
    const fetch = openrouter(() =>
      fail ? "network-error" : { body: fixture("openrouter/endpoints/qwen_qwen-image-2.1-turbo.json") },
    );
    t = createTestApp({ openRouterApiKey: KEY }, { fetch });
    const res = await t.app.request(`/api/providers/openrouter/price?model=${encodeURIComponent(QWEN)}`);
    expect(res.status).toBe(502);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("PROVIDER_ERROR");
    fail = false;
    expect((await t.app.request(`/api/providers/openrouter/price?model=${encodeURIComponent(QWEN)}`)).status).toBe(200);
  });

  it("answers an unknown model as not found without asking for its price", async () => {
    const fetch = openrouter(() => ({ body: {} }));
    t = createTestApp({ openRouterApiKey: KEY }, { fetch });
    const res = await t.app.request("/api/providers/openrouter/price?model=nope%2Fmodel");
    expect(res.status).toBe(404);
    expect(priceCalls(fetch)).toHaveLength(0);
    expect((await t.app.request("/api/providers/nope/price?model=x")).status).toBe(404);
    expect((await t.app.request("/api/providers/openrouter/price")).status).toBe(400);
  });

  it("never sends an unchecked model id to the provider when the model list can't be loaded", async () => {
    const fetch = fakeFetch((url) => (url.endsWith("/images/models") ? "network-error" : { body: {} }));
    t = createTestApp({ openRouterApiKey: KEY }, { fetch });
    const res = await t.app.request("/api/providers/openrouter/price?model=any%2Fthing");
    expect(res.status).toBe(502);
    expect(priceCalls(fetch)).toHaveLength(0);
  });

  it("refuses a foreign page and an unconfigured provider", async () => {
    t = createTestApp({}, { fetch: openrouter(() => ({ body: {} })) });
    expect((await t.app.request(`/api/providers/openrouter/price?model=${QWEN}`)).status).toBe(409);
    const foreign = await t.app.request(`/api/providers/openrouter/price?model=${QWEN}`, {
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(foreign.status).toBe(403);
  });
});
