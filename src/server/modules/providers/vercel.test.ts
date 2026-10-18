import { describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { TINY_PNG } from "../../../../tests/helpers/generations";
import { ProviderError } from "./port";
import { createVercelProvider } from "./vercel";

const KEY = "vck-test-KEY";
const BASE = "https://ai-gateway.vercel.sh/v1";
type Reply = ReturnType<Parameters<typeof fakeFetch>[0]>;

function provider(answer: (url: string, init: RequestInit) => Reply, apiKey: string | null = KEY) {
  const fetch = fakeFetch((url, init) =>
    url === `${BASE}/models` ? { body: fixture("vercel/models.json") } : answer(url, init),
  );
  return { p: createVercelProvider({ apiKey: apiKey ?? undefined, fetch }), fetch };
}
const sent = (f: ReturnType<typeof fakeFetch>, path: string) => {
  const call = f.calls.find((c) => c.url === `${BASE}${path}`);
  return { call, body: call ? JSON.parse(String(call.init.body)) : undefined };
};
const signal = () => new AbortController().signal;

describe("Vercel adapter — catalog", () => {
  it("lists only image-producing models with what each accepts", async () => {
    const { p, fetch } = provider(() => ({ body: {} }));
    expect(await p.listModels()).toEqual([
      { id: "bfl/flux-2-pro", name: "FLUX.2 [pro]", params: { n: { max: 4 } } },
      { id: "openai/gpt-image-2", name: expect.any(String), params: { n: { max: 4 } } },
      { id: "google/gemini-3.1-flash-image", name: expect.any(String), params: { inputs: { min: 0, max: 8 } } },
    ]);
    expect(new Headers(fetch.calls[0]?.init.headers).get("authorization")).toBeNull(); // public catalog, no key sent
  });
});

describe("Vercel adapter — generate", () => {
  it("uses the images API for an image-only model and redacts the answer", async () => {
    const { p, fetch } = provider(() => ({ body: fixture("vercel/images-generations.json") }));
    const result = await p.generate({ model: "bfl/flux-2-pro", prompt: "A red square", params: { n: 2 } }, signal());
    const { call, body } = sent(fetch, "/images/generations");
    expect(new Headers(call?.init.headers).get("authorization")).toBe(`Bearer ${KEY}`);
    expect(body).toEqual({ model: "bfl/flux-2-pro", prompt: "A red square", n: 2, response_format: "b64_json" });
    expect(result.images.map(({ mediaType, width, height }) => ({ mediaType, width, height }))).toEqual([
      { mediaType: "image/png", width: 5, height: 3 },
      { mediaType: "image/png", width: 3, height: 5 },
    ]);
    expect(result).toMatchObject({ costUsd: null, costRef: null, acceptedParams: null });
    expect(result.rawResponse).toMatchObject({ data: [{ b64_json: { $image: 1 } }, { b64_json: { $image: 2 } }] });
    expect(JSON.stringify([result.rawRequest, result.rawResponse])).not.toMatch(/vck-test-KEY|iVBOR/);
  });

  it("asks a multimodal language model for image output through chat and returns its generation id", async () => {
    const { p, fetch } = provider(() => ({ body: fixture("vercel/chat-image.json") }));
    const result = await p.generate(
      { model: "google/gemini-3.1-flash-image", prompt: "A red square", params: { n: 1 } },
      signal(),
    );
    expect(sent(fetch, "/chat/completions").body).toEqual({
      model: "google/gemini-3.1-flash-image",
      messages: [{ role: "user", content: "A red square" }],
      modalities: ["text", "image"],
      stream: false,
    });
    expect(result.images).toHaveLength(1);
    expect(result.costRef).toBe("gen_01CHATREF00000000000000000");
    expect(result.rawResponse).toMatchObject({
      choices: [{ message: { content: "Here is a red square.", images: [{ image_url: { url: { $image: 1 } } }] } }],
    });
  });

  it("sends attached images through the edit path as data URLs and stores placeholders", async () => {
    const { p, fetch } = provider(() => ({ body: fixture("vercel/images-edits.json") }));
    const result = await p.generate(
      {
        model: "google/gemini-3.1-flash-image",
        prompt: "Make it blue",
        params: { n: 1 },
        inputs: [{ bytes: TINY_PNG, mediaType: "image/png" }],
      },
      signal(),
    );
    const { body } = sent(fetch, "/images/edits");
    expect(body).toMatchObject({ model: "google/gemini-3.1-flash-image", prompt: "Make it blue", n: 1 });
    expect(body.images[0].image_url).toMatch(/^data:image\/png;base64,iVBOR/);
    expect(result.rawRequest).toEqual({
      method: "POST",
      url: `${BASE}/images/edits`,
      body: {
        model: "google/gemini-3.1-flash-image",
        prompt: "Make it blue",
        n: 1,
        images: [{ image_url: { $input: 1 } }],
      },
    });
    expect(result.costRef).toBe("gen_01EDITREF00000000000000000");
  });

  it("refreshes the catalog once for an unknown model, then explains", async () => {
    const { p, fetch } = provider(() => ({ body: {} }));
    await expect(p.generate({ model: "nope/model", prompt: "x", params: { n: 1 } }, signal())).rejects.toMatchObject({
      provider: "vercel",
      message: "This model is not offered by Vercel AI Gateway for images",
    });
    expect(fetch.calls.filter((c) => c.url === `${BASE}/models`)).toHaveLength(1);
  });

  it("fails with the gateway's reason, on a text-only answer, and on timeout", async () => {
    const { p } = provider(() => ({ status: 402, body: fixture("vercel/error-402.json") }));
    await expect(
      p.generate({ model: "bfl/flux-2-pro", prompt: "x", params: { n: 1 } }, signal()),
    ).rejects.toMatchObject({
      provider: "vercel",
      upstreamStatus: 402,
      message: "Insufficient funds. Add credits to your AI Gateway balance.",
    });
    const { p: text } = provider(() => ({ body: fixture("vercel/chat-text-only.json") }));
    await expect(
      text.generate({ model: "google/gemini-3.1-flash-image", prompt: "x", params: { n: 1 } }, signal()),
    ).rejects.toMatchObject({ message: "The provider returned no usable image" });
    const { p: slow } = provider(() => "hang");
    const ctrl = new AbortController();
    const pending = slow.generate({ model: "bfl/flux-2-pro", prompt: "x", params: { n: 1 } }, ctrl.signal);
    ctrl.abort(new DOMException("timed out", "TimeoutError"));
    await expect(pending).rejects.toMatchObject({
      upstreamStatus: null,
      message: "The provider did not answer in time",
    });
  });

  it("is not configured without a key and never calls the gateway to generate", async () => {
    const { p, fetch } = provider(() => ({ body: {} }), null);
    expect(p.configured).toBe(false);
    await expect(
      p.generate({ model: "bfl/flux-2-pro", prompt: "x", params: { n: 1 } }, signal()),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(fetch.calls).toHaveLength(0);
  });
});
