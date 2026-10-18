import { afterEach, describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { TINY_PNG } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { CurrentJobResponse, Generation } from "../../../shared/generations";

const OR_KEY = "sk-or-test-KEY";
const VC_KEY = "vck-test-KEY";
const VERCEL = "https://ai-gateway.vercel.sh/v1";

function http(openrouterAnswer = "openrouter/images-success.json") {
  return fakeFetch((url) => {
    if (url === `${VERCEL}/models`) return { body: fixture("vercel/models.json") };
    if (url === `${VERCEL}/chat/completions`) return { body: fixture("vercel/chat-image.json") };
    if (url === `${VERCEL}/images/generations`) return { body: fixture("vercel/images-generations.json") };
    if (url === `${VERCEL}/images/edits`) return { body: fixture("vercel/images-edits.json") };
    if (url.startsWith(`${VERCEL}/generation`))
      return { status: 404, body: fixture("vercel/generation-not-found.json") };
    if (url.endsWith("/images/models")) return { body: fixture("openrouter/models.json") };
    return { body: fixture(openrouterAnswer) };
  });
}

async function generate(t: ReturnType<typeof createTestApp>, request: unknown, files: Uint8Array[] = []) {
  const init: RequestInit = files.length
    ? (() => {
        const fd = new FormData();
        fd.append("request", JSON.stringify(request));
        for (const f of files) fd.append("inputs", new Blob([Buffer.from(f)], { type: "image/png" }), "in.png");
        return { method: "POST", body: fd };
      })()
    : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) };
  expect((await t.app.request("/api/generations", init)).status).toBe(202);
  for (let i = 0; i < 200; i++) {
    const { job } = CurrentJobResponse.parse(await (await t.app.request("/api/generation-job")).json());
    if (job?.status === "succeeded")
      return Generation.parse(await (await t.app.request(`/api/generations/${job.generationId}`)).json());
    if (job?.status === "failed") throw new Error(job.error?.message);
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("job did not finish");
}

describe("regression and secrets with two providers", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  it("OpenRouter sends the same requests and records costs exactly as before (AC-15)", async () => {
    t = createTestApp({ openRouterApiKey: OR_KEY, aiGatewayApiKey: VC_KEY }, { fetch: http() });
    const text = await generate(t, {
      provider: "openrouter",
      model: "qwen/qwen-image-2.1-turbo",
      prompt: "A red square",
      params: { n: 2, aspectRatio: "16:9", seed: 7 },
    });
    expect(text.rawRequest).toEqual({
      method: "POST",
      url: "https://openrouter.ai/api/v1/images",
      body: { model: "qwen/qwen-image-2.1-turbo", prompt: "A red square", n: 2, aspect_ratio: "16:9", seed: 7 },
    });
    expect(text).toMatchObject({ provider: "openrouter", costStatus: "known", costMicros: 40000 });

    const withInputs = await generate(
      t,
      { provider: "openrouter", model: "qwen/qwen-image-2.1-turbo", prompt: "Blue", params: { n: 1 } },
      [TINY_PNG],
    );
    expect(withInputs.rawRequest).toMatchObject({
      body: {
        input_references: [
          { type: "image_url", image_url: { url: { $file: withInputs.inputs[0]?.url.replace("/api/files/", "") } } },
        ],
      },
    });
  });

  it("an OpenRouter answer without a price is still unavailable, never pending", async () => {
    t = createTestApp({ openRouterApiKey: OR_KEY }, { fetch: http("openrouter/images-no-cost.json") });
    const g = await generate(t, {
      provider: "openrouter",
      model: "qwen/qwen-image-2.1-turbo",
      prompt: "x",
      params: { n: 1 },
    });
    expect(g).toMatchObject({ costStatus: "unavailable", costMicros: null });
  });

  it("stored rows hold neither key nor image data for any Vercel call path (AC-13)", async () => {
    t = createTestApp({ openRouterApiKey: OR_KEY, aiGatewayApiKey: VC_KEY }, { fetch: http() });
    await generate(t, { provider: "vercel", model: "bfl/flux-2-pro", prompt: "x", params: { n: 2 } });
    await generate(t, { provider: "vercel", model: "google/gemini-3.1-flash-image", prompt: "x", params: { n: 1 } });
    await generate(t, { provider: "vercel", model: "google/gemini-3.1-flash-image", prompt: "x", params: { n: 1 } }, [
      TINY_PNG,
    ]);
    const rows = t.db.prepare("SELECT raw_request || raw_response FROM generations").pluck().all() as string[];
    expect(rows).toHaveLength(3);
    for (const raw of rows) {
      expect(raw).not.toContain(VC_KEY);
      expect(raw).not.toContain(OR_KEY);
      expect(raw).not.toMatch(/iVBORw0KGgo/); // no base64 PNG anywhere (outputs or inputs)
      expect(raw).not.toMatch(/data:image\//);
    }
  });
});
