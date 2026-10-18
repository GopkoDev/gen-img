import { describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { createOpenRouterProvider } from "./openrouter";
import { ProviderError } from "./port";

const ep = (name: string) => fixture(`openrouter/endpoints/${name}.json`);

function provider(reply: Parameters<typeof fakeFetch>[0]) {
  const fetch = fakeFetch(reply);
  return { p: createOpenRouterProvider({ apiKey: "sk-or-test-KEY", fetch }), fetch };
}

describe("OpenRouter adapter — published prices", () => {
  it("reads one per-image price and a free input image from the model's endpoints, without the key", async () => {
    const { p, fetch } = provider(() => ({ body: ep("qwen_qwen-image-2.1-turbo") }));
    expect(await p.priceOf?.("qwen/qwen-image-2.1-turbo", new AbortController().signal)).toEqual({
      kind: "per-image",
      output: { minUsd: 0.0184, maxUsd: 0.0184 },
      input: { minUsd: 0, maxUsd: 0 },
    });
    expect(fetch.calls[0]?.url).toBe("https://openrouter.ai/api/v1/images/models/qwen/qwen-image-2.1-turbo/endpoints");
    expect(new Headers(fetch.calls[0]?.init.headers).get("authorization")).toBeNull();
  });

  it("gives a range over variants and a per-input-image price", async () => {
    const { p } = provider(() => ({ body: ep("bytedance-seed_seedream-5-0-pro") }));
    expect(await p.priceOf?.("bytedance-seed/seedream-5-0-pro", new AbortController().signal)).toEqual({
      kind: "per-image",
      output: { minUsd: 0.045, maxUsd: 0.09 },
      input: { minUsd: 0.003, maxUsd: 0.003 },
    });
  });

  it("reads per-image only when output is billed per image, per-token otherwise, unknown with no endpoints", async () => {
    const recraft = provider(() => ({ body: ep("recraft_recraft-v4.1-flash") }));
    expect(await recraft.p.priceOf?.("recraft/recraft-v4.1-flash", new AbortController().signal)).toEqual({
      kind: "per-image",
      output: { minUsd: 0.007, maxUsd: 0.007 },
      input: null,
    });
    const gpt = provider(() => ({ body: ep("openai_gpt-image-1") }));
    expect(await gpt.p.priceOf?.("openai/gpt-image-1", new AbortController().signal)).toEqual({ kind: "per-token" });
    const muse = provider(() => ({ body: ep("meta_muse-image") }));
    expect(await muse.p.priceOf?.("meta/muse-image", new AbortController().signal)).toEqual({ kind: "unknown" });
    const odd = provider(() => ({
      body: { endpoints: [{ pricing: [{ billable: "request", unit: "request", cost_usd: 1 }] }] },
    }));
    expect(await odd.p.priceOf?.("x/y", new AbortController().signal)).toEqual({ kind: "unknown" });
  });

  it("keeps the per-image range when another endpoint bills per token", async () => {
    const mixed = {
      endpoints: [
        { pricing: [{ billable: "output_image", unit: "image", cost_usd: 0.05 }] },
        { pricing: [{ billable: "output_image", unit: "token", cost_usd: 0.00004 }] },
      ],
    };
    const { p } = provider(() => ({ body: mixed }));
    expect(await p.priceOf?.("x/y", new AbortController().signal)).toMatchObject({
      kind: "per-image",
      output: { minUsd: 0.05 },
    });
  });

  it("encodes each part of the model id and turns failures into provider errors", async () => {
    const { p, fetch } = provider(() => ({ status: 503, body: { error: { code: 503, message: "busy" } } }));
    await expect(p.priceOf?.("odd/na me?x", new AbortController().signal)).rejects.toBeInstanceOf(ProviderError);
    expect(fetch.calls[0]?.url).toBe("https://openrouter.ai/api/v1/images/models/odd/na%20me%3Fx/endpoints");
  });
});
