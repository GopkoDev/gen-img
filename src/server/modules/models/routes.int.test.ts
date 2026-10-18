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

  it("stamps updatedAt from the injected clock (R6)", async () => {
    const fetch = catalogFetch();
    t = createTestApp(
      { openRouterApiKey: "k", aiGatewayApiKey: "k" },
      { fetch, now: () => Date.UTC(2030, 0, 2, 3, 4, 5) },
    );
    const res = ModelPreference.parse(
      await (await patch({ provider: "openrouter", model: OR_MODEL, favorite: true })).json(),
    );
    expect(res.updatedAt).toBe("2030-01-02T03:04:05.000Z");
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

  describe("off-writes skip the provider and catalog (AC-08, AC-12, ADR-0029)", () => {
    it("forgets a retired model id with 200 and removes the row", async () => {
      setup();
      seedModelPreference(t.db, { provider: "openrouter", model: "gone/old-model", favorite: true, hidden: true });
      const res = await patch({ provider: "openrouter", model: "gone/old-model", favorite: false, hidden: false });
      expect(res.status).toBe(200);
      expect(ModelPreference.parse(await res.json())).toMatchObject({
        favorite: false,
        hidden: false,
        updatedAt: null,
      });
      expect(rowCount()).toBe(0);
    });

    it("un-hides while the catalog fails with 200", async () => {
      setup(fakeFetch(() => "network-error"));
      seedModelPreference(t.db, { provider: "openrouter", model: OR_MODEL, hidden: true });
      const res = await patch({ provider: "openrouter", model: OR_MODEL, hidden: false });
      expect(res.status).toBe(200);
      expect(rowCount()).toBe(0);
    });

    it("un-favorites with the provider unconfigured with 200", async () => {
      t = createTestApp({}, { fetch: catalogFetch() });
      seedModelPreference(t.db, { provider: "openrouter", model: OR_MODEL, favorite: true });
      const res = await patch({ provider: "openrouter", model: OR_MODEL, favorite: false });
      expect(res.status).toBe(200);
      expect(rowCount()).toBe(0);
    });

    it("answers 200 with both flags off and updatedAt null for a never-stored id", async () => {
      setup();
      const res = await patch({ provider: "openrouter", model: "never/stored", favorite: false });
      expect(res.status).toBe(200);
      expect(ModelPreference.parse(await res.json())).toEqual({
        provider: "openrouter",
        model: "never/stored",
        favorite: false,
        hidden: false,
        updatedAt: null,
      });
    });

    it("does not call the catalog for an off-write", async () => {
      const fetch = setup();
      await patch({ provider: "openrouter", model: OR_MODEL, favorite: false });
      expect(fetch.calls ?? []).toHaveLength(0);
    });

    it("still checks the catalog when any named flag turns on", async () => {
      setup();
      const mixed = await patch({ provider: "openrouter", model: "no/such-model", favorite: false, hidden: true });
      expect(mixed.status).toBe(404);
      t.cleanup();
      setup(fakeFetch(() => "network-error"));
      expect((await patch({ provider: "openrouter", model: OR_MODEL, hidden: true })).status).toBe(502);
      t.cleanup();
      t = createTestApp({}, { fetch: catalogFetch() });
      expect((await patch({ provider: "openrouter", model: OR_MODEL, favorite: true })).status).toBe(409);
      expect(rowCount()).toBe(0);
    });

    it("refuses an unknown provider on an off-write with 404", async () => {
      setup();
      const res = await patch({ provider: "nope", model: OR_MODEL, favorite: false });
      expect(res.status).toBe(404);
      expect(ErrorResponse.parse(await res.json()).error.code).toBe("NOT_FOUND");
    });

    it("refuses a foreign Origin on an off-write with 403 and keeps the row", async () => {
      setup();
      seedModelPreference(t.db, { provider: "openrouter", model: OR_MODEL, favorite: true });
      const res = await patch(
        { provider: "openrouter", model: OR_MODEL, favorite: false },
        { origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      );
      expect(res.status).toBe(403);
      expect(rowCount()).toBe(1);
    });
  });

  it("keeps preferences after the app restarts over the same data dir (AC-03)", async () => {
    setup();
    await patch({ provider: "openrouter", model: OR_MODEL, favorite: true });
    t.restart();
    expect(await list("openrouter")).toMatchObject([{ model: OR_MODEL, favorite: true, hidden: false }]);
  });
});
