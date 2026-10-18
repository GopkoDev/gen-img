import { describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { createOpenRouterProvider } from "./openrouter";
import { ProviderError } from "./port";

const KEY = "sk-or-test-KEY";
const input = {
  model: "qwen/qwen-image-2.1-turbo",
  prompt: "A red square",
  params: { n: 2, aspectRatio: "16:9", seed: 7 },
};

function provider(reply: Parameters<typeof fakeFetch>[0], apiKey: string | null = KEY) {
  const fetch = fakeFetch(reply);
  return { p: createOpenRouterProvider({ apiKey: apiKey ?? undefined, fetch }), fetch };
}

describe("OpenRouter adapter — catalog", () => {
  it("lists image-output models with only their supported parameters (n capped at 4)", async () => {
    const { p, fetch } = provider(() => ({ body: fixture("openrouter/models.json") }));
    const models = await p.listModels();
    expect(fetch.calls[0]?.url).toBe("https://openrouter.ai/api/v1/images/models");
    expect(models).toEqual([
      {
        id: "qwen/qwen-image-2.1-turbo",
        name: "Qwen: Qwen Image 2.1 Turbo",
        params: {
          aspectRatio: {
            values: ["1:1", "1:2", "1:4", "2:1", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "9:16", "16:9"],
          },
          n: { max: 4 },
          seed: {},
        },
      },
      {
        id: "recraft/recraft-v4.1-flash",
        name: expect.any(String),
        params: { aspectRatio: { values: expect.any(Array) }, n: { max: expect.any(Number) } },
      },
      { id: "meta/muse-image", name: expect.any(String), params: {} },
    ]);
  });

  it("turns a catalog failure into a ProviderError", async () => {
    const { p } = provider(() => ({ status: 503, body: { error: { code: 503, message: "No provider available" } } }));
    await expect(p.listModels()).rejects.toMatchObject({
      provider: "openrouter",
      upstreamStatus: 503,
      message: "No provider available",
    });
    const { p: down } = provider(() => "network-error");
    await expect(down.listModels()).rejects.toBeInstanceOf(ProviderError);
  });
});

describe("OpenRouter adapter — generate", () => {
  it("sends the request with the key and returns decoded images, cost and a redacted exchange", async () => {
    const { p, fetch } = provider(() => ({ body: fixture("openrouter/images-success.json") }));
    const result = await p.generate(input, new AbortController().signal);

    const call = fetch.calls[0];
    expect(call?.url).toBe("https://openrouter.ai/api/v1/images");
    expect(call?.init.method).toBe("POST");
    expect(new Headers(call?.init.headers).get("authorization")).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(String(call?.init.body))).toEqual({
      model: input.model,
      prompt: input.prompt,
      n: 2,
      aspect_ratio: "16:9",
      seed: 7,
    });

    expect(result.images.map(({ mediaType, width, height }) => ({ mediaType, width, height }))).toEqual([
      { mediaType: "image/png", width: 4, height: 3 },
      { mediaType: "image/png", width: 3, height: 4 },
    ]);
    expect(result.images[0]?.bytes).toBeInstanceOf(Uint8Array);
    expect(result.costUsd).toBe(0.04);
    expect(result.acceptedParams).toBeNull();

    const stored = JSON.stringify([result.rawRequest, result.rawResponse]);
    expect(stored).not.toContain(KEY);
    expect(stored).not.toContain('b64_json":"');
    expect(result.rawRequest).toEqual({
      method: "POST",
      url: "https://openrouter.ai/api/v1/images",
      body: { model: input.model, prompt: input.prompt, n: 2, aspect_ratio: "16:9", seed: 7 },
    });
    expect(result.rawResponse).toMatchObject({
      data: [{ b64_json: { $image: 1 } }, { b64_json: { $image: 2 } }],
      usage: { cost: 0.04 },
    });
  });

  it("omits optional parameters the Owner did not set", async () => {
    const { p, fetch } = provider(() => ({ body: fixture("openrouter/images-no-cost.json") }));
    const result = await p.generate({ model: "m", prompt: "x", params: { n: 1 } }, new AbortController().signal);
    expect(JSON.parse(String(fetch.calls[0]?.init.body))).toEqual({ model: "m", prompt: "x", n: 1 });
    expect(result.costUsd).toBeNull();
  });

  it("fails when the answer has no usable image", async () => {
    const { p } = provider(() => ({ body: fixture("openrouter/images-svg-only.json") }));
    await expect(p.generate(input, new AbortController().signal)).rejects.toMatchObject({
      message: "The provider returned no usable image",
    });
  });

  it("passes the provider's reason through for refusals", async () => {
    const { p } = provider(() => ({ status: 402, body: fixture("openrouter/error-402.json") }));
    await expect(p.generate(input, new AbortController().signal)).rejects.toMatchObject({
      upstreamStatus: 402,
      message: "Your account or API key has insufficient credits. Add more credits and retry the request.",
    });
    const { p: mod } = provider(() => ({ status: 403, body: fixture("openrouter/error-403-moderation.json") }));
    await expect(mod.generate(input, new AbortController().signal)).rejects.toMatchObject({
      upstreamStatus: 403,
      message: "Input was flagged by moderation (violence)",
    });
  });

  it("reports a timeout when the signal aborts", async () => {
    const { p } = provider(() => "hang");
    const ctrl = new AbortController();
    const pending = p.generate(input, ctrl.signal);
    ctrl.abort(new DOMException("timed out", "TimeoutError"));
    await expect(pending).rejects.toMatchObject({
      upstreamStatus: null,
      message: "The provider did not answer in time",
    });
  });

  it("is not configured without a key and refuses to generate", async () => {
    const { p, fetch } = provider(() => ({ body: {} }), null);
    expect(p.configured).toBe(false);
    await expect(p.generate(input, new AbortController().signal)).rejects.toBeInstanceOf(ProviderError);
    expect(fetch.calls).toHaveLength(0);
  });
});
