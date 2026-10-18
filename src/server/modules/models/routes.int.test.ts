import { afterEach, describe, expect, it } from "vitest";
import { fakeFetch, fixture } from "../../../../tests/helpers/fake-fetch";
import { seedModelPreference } from "../../../../tests/helpers/models";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { ModelPreference, PreferencesResponse } from "../../../shared/models";

const OR_MODEL = "qwen/qwen-image-2.1-turbo";
const VERCEL_MODEL = "bfl/flux-2-pro";

const catalogFetch = () =>
  fakeFetch((url) =>
    url.includes("openrouter") ? { body: fixture("openrouter/models.json") } : { body: fixture("vercel/models.json") },
  );

describe("model preferences routes", () => {
  let t: ReturnType<typeof createTestApp>;
  afterEach(() => t?.cleanup());

  const setup = (fetch = catalogFetch()) => {
    t = createTestApp({ openRouterApiKey: "k", aiGatewayApiKey: "k" }, { fetch });
    return fetch;
  };
  const patch = (body: unknown, headers: Record<string, string> = {}) =>
    t.app.request("/api/model-preferences", {
      method: "PATCH",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  const list = async (provider: string) =>
    PreferencesResponse.parse(await (await t.app.request(`/api/model-preferences?provider=${provider}`)).json())
      .preferences;
  const rowCount = () => (t.db.prepare("SELECT COUNT(*) AS n FROM model_preferences").get() as { n: number }).n;

  it("starts empty, favorites a model, and toggling twice ends where it started (AC-03, AC-07)", async () => {
    setup();
    expect(await list("openrouter")).toEqual([]);
    const on = await patch({ provider: "openrouter", model: OR_MODEL, favorite: true });
    expect(on.status).toBe(200);
    const row = ModelPreference.parse(await on.json());
    expect(row).toMatchObject({ provider: "openrouter", model: OR_MODEL, favorite: true, hidden: false });
    expect(row.updatedAt).not.toBeNull();
    expect(await list("openrouter")).toHaveLength(1);
    expect(await list("vercel")).toEqual([]);

    const off = ModelPreference.parse(
      await (await patch({ provider: "openrouter", model: OR_MODEL, favorite: false })).json(),
    );
    expect(off).toEqual({ provider: "openrouter", model: OR_MODEL, favorite: false, hidden: false, updatedAt: null });
    expect(await list("openrouter")).toEqual([]);
    expect(rowCount()).toBe(0);
  });

  it("keeps preferences per provider (AC-07)", async () => {
    setup();
    await patch({ provider: "openrouter", model: OR_MODEL, favorite: true });
    await patch({ provider: "vercel", model: VERCEL_MODEL, hidden: true });
    expect((await list("openrouter")).map((p) => p.model)).toEqual([OR_MODEL]);
    expect((await list("vercel")).map((p) => p.model)).toEqual([VERCEL_MODEL]);
  });

  it("merges flags: a favorite write keeps the stored hidden flag", async () => {
    setup();
    seedModelPreference(t.db, { provider: "openrouter", model: OR_MODEL, hidden: true });
    const res = ModelPreference.parse(
      await (await patch({ provider: "openrouter", model: OR_MODEL, favorite: true })).json(),
    );
    expect(res).toMatchObject({ favorite: true, hidden: true });
    expect(await list("openrouter")).toMatchObject([{ model: OR_MODEL, favorite: true, hidden: true }]);
  });

  it("upserts one row per provider and model", async () => {
    setup();
    await patch({ provider: "openrouter", model: OR_MODEL, favorite: true });
    await patch({ provider: "openrouter", model: OR_MODEL, hidden: true });
    expect(rowCount()).toBe(1);
  });

  it("deletes the row when both flags end off", async () => {
    setup();
    seedModelPreference(t.db, { provider: "openrouter", model: OR_MODEL, favorite: true, hidden: true });
    const res = await patch({ provider: "openrouter", model: OR_MODEL, favorite: false, hidden: false });
    expect(ModelPreference.parse(await res.json())).toMatchObject({ favorite: false, hidden: false, updatedAt: null });
    expect(rowCount()).toBe(0);
  });

  it("refuses a model the catalog does not list with 404 and stores nothing (AC-06)", async () => {
    setup();
    const res = await patch({ provider: "openrouter", model: "no/such-model", favorite: true });
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("NOT_FOUND");
    expect(rowCount()).toBe(0);
  });

  it("refuses an unknown provider with 404 and stores nothing (AC-06)", async () => {
    setup();
    const res = await patch({ provider: "nope", model: OR_MODEL, favorite: true });
    expect(res.status).toBe(404);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("NOT_FOUND");
    expect(rowCount()).toBe(0);
  });

  it("answers 502 PROVIDER_ERROR and stores nothing when the catalog is unavailable", async () => {
    setup(fakeFetch(() => "network-error"));
    const res = await patch({ provider: "openrouter", model: OR_MODEL, favorite: true });
    expect(res.status).toBe(502);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("PROVIDER_ERROR");
    expect(rowCount()).toBe(0);
  });

  it("answers 409 when the provider is not configured", async () => {
    t = createTestApp({}, { fetch: catalogFetch() });
    const res = await patch({ provider: "openrouter", model: OR_MODEL, favorite: true });
    expect(res.status).toBe(409);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("PROVIDER_NOT_CONFIGURED");
    expect(rowCount()).toBe(0);
  });

  it("rejects bad bodies with 400 VALIDATION_ERROR", async () => {
    setup();
    const bad = [
      { provider: "openrouter", model: OR_MODEL },
      { provider: "openrouter", model: OR_MODEL, favorite: true, extra: 1 },
      { provider: "openrouter", model: "", favorite: true },
      { provider: "openrouter", model: "x".repeat(201), favorite: true },
      { provider: "openrouter", model: OR_MODEL, favorite: "yes" },
    ];
    for (const body of bad) {
      const res = await patch(body);
      expect(res.status).toBe(400);
      expect(ErrorResponse.parse(await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
    expect(rowCount()).toBe(0);
  });

  it("rejects a list request without a valid provider with 400", async () => {
    setup();
    expect((await t.app.request("/api/model-preferences")).status).toBe(400);
    expect((await t.app.request("/api/model-preferences?provider=nope")).status).toBe(400);
  });

  it("refuses a foreign Origin on read and write and changes nothing (AC-12)", async () => {
    setup();
    const foreign = { origin: "https://evil.example", "sec-fetch-site": "cross-site" };
    const write = await patch({ provider: "openrouter", model: OR_MODEL, favorite: true }, foreign);
    expect(write.status).toBe(403);
    expect(rowCount()).toBe(0);
    seedModelPreference(t.db, { provider: "openrouter", model: OR_MODEL, favorite: true });
    const read = await t.app.request("/api/model-preferences?provider=openrouter", { headers: foreign });
    expect(read.status).toBe(403);
  });

  it("still lists rows of models missing from the catalog (AC-08)", async () => {
    setup();
    seedModelPreference(t.db, { provider: "openrouter", model: "gone/old-model", favorite: true });
    expect(await list("openrouter")).toMatchObject([{ model: "gone/old-model", favorite: true }]);
  });

  it("keeps preferences after the app restarts over the same data dir (AC-03)", async () => {
    setup();
    await patch({ provider: "openrouter", model: OR_MODEL, favorite: true });
    t.restart();
    expect(await list("openrouter")).toMatchObject([{ model: OR_MODEL, favorite: true, hidden: false }]);
  });
});
