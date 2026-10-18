import { describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { createVercelProvider } from "./vercel";

const signal = () => new AbortController().signal;

function provider() {
  const fetch = fakeFetch(() => ({ body: fixture("vercel/models-pricing.json") }));
  return { p: createVercelProvider({ apiKey: "vk-test-KEY", fetch }), fetch };
}

describe("Vercel adapter — published prices", () => {
  it("uses the default per-image price, and the «default» size when only sizes are listed", async () => {
    const { p } = provider();
    expect(await p.priceOf?.("bfl/flux-kontext-pro", signal())).toEqual({
      kind: "per-image",
      output: { minUsd: 0.04, maxUsd: 0.04 },
      input: null,
    });
    expect(await p.priceOf?.("bfl/flux-3-image", signal())).toMatchObject({ output: { minUsd: 0.048, maxUsd: 0.048 } });
    expect(await p.priceOf?.("google/gemini-3.1-flash-image", signal())).toMatchObject({
      kind: "per-image",
      output: { minUsd: 0.067, maxUsd: 0.067 },
    });
  });

  it("reads token-only pricing as per-token, ignores non-size entries, and an empty price as unknown", async () => {
    const { p } = provider();
    expect(await p.priceOf?.("openai/gpt-image-1", signal())).toEqual({ kind: "per-token" });
    expect(await p.priceOf?.("microsoft/mai-image-2.6", signal())).toEqual({ kind: "per-token" });
    expect(await p.priceOf?.("bfl/flux-2-flex", signal())).toEqual({ kind: "unknown" });
  });

  it("answers from the listing it holds, refreshes once for an unknown model, and sends no key", async () => {
    const { p, fetch } = provider();
    await p.listModels();
    await p.priceOf?.("bfl/flux-kontext-pro", signal());
    expect(fetch.calls).toHaveLength(1);
    expect(await p.priceOf?.("nope/model", signal())).toEqual({ kind: "unknown" });
    expect(fetch.calls).toHaveLength(2);
    for (const c of fetch.calls) expect(new Headers(c.init.headers).get("authorization")).toBeNull();
  });
});
