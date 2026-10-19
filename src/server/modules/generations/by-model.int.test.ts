import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { GenerationPage } from "../../../shared/generations";

// gallery-by-model: filtered list + models read (spec AC-01, AC-02, AC-05, AC-06, AC-08, AC-09; SAD §8; ADR-0036).
type Group = { provider: string; model: string; count: number; latestId: string; items: { id: string }[] };

describe("gallery by model", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  const get = (path: string, headers?: Record<string, string>) => t.app.request(`/api${path}`, { headers });
  const q = (provider: string, model: string, extra = "") =>
    `/generations?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}${extra}`;
  const models = async (query = ""): Promise<Group[]> => {
    const res = await get(`/generations/models${query}`);
    expect(res.status).toBe(200);
    return ((await res.json()) as { models: Group[] }).models;
  };
  const seed = (model: string, provider: "openrouter" | "vercel" = "openrouter") =>
    seedGeneration(t.db, t.dataDir, { model, provider }).id;

  it("pages one model's generations newest first with a cursor, skipping other models", async () => {
    const a = [seed("x/a"), seed("x/b"), seed("x/a"), seed("x/a"), seed("x/b"), seed("x/a")];
    const aIds = a.filter((_, i) => [0, 2, 3, 5].includes(i));
    const first = GenerationPage.parse(await (await get(q("openrouter", "x/a", "&limit=3"))).json());
    expect(first.items.map((g) => g.id)).toEqual([aIds[3], aIds[2], aIds[1]]);
    expect(first.items.every((g) => g.model === "x/a" && g.thumbnail.position === 1)).toBe(true);
    expect(first.nextCursor).toBe(aIds[1]);
    const second = GenerationPage.parse(
      await (await get(q("openrouter", "x/a", `&limit=3&cursor=${first.nextCursor}`))).json(),
    );
    expect(second.items.map((g) => g.id)).toEqual([aIds[0]]);
    expect(second.nextCursor).toBeNull();
  });

  it("matches the stored provider + model exactly: odd characters, case, and the same id under two providers", async () => {
    const ids = ["org/Model:v1+x", "My Model 2", "my model 2", "org/model:v1+x"].map((m) => seed(m));
    expect(
      GenerationPage.parse(await (await get(q("openrouter", "org/Model:v1+x"))).json()).items.map((g) => g.id),
    ).toEqual([ids[0]]);
    expect(
      GenerationPage.parse(await (await get(q("openrouter", "my model 2"))).json()).items.map((g) => g.id),
    ).toEqual([ids[2]]);
    const or = seed("same/id");
    const vc = seed("same/id", "vercel");
    expect(GenerationPage.parse(await (await get(q("openrouter", "same/id"))).json()).items.map((g) => g.id)).toEqual([
      or,
    ]);
    expect(GenerationPage.parse(await (await get(q("vercel", "same/id"))).json()).items.map((g) => g.id)).toEqual([vc]);
    expect((await models()).filter((g) => g.model === "same/id").map((g) => [g.provider, g.count])).toEqual([
      ["vercel", 1],
      ["openrouter", 1],
    ]);
  });

  it("an unknown provider or model is an empty page, not an error", async () => {
    seed("x/a");
    for (const [p, m] of [
      ["openrouter", "nope"],
      ["nope-provider", "x/a"],
    ] as const) {
      const res = await get(q(p, m));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ items: [], nextCursor: null });
    }
  });

  it("only one of provider / model, or a bad query, is VALIDATION_ERROR (400)", async () => {
    for (const path of [
      "/generations?provider=openrouter",
      "/generations?model=x%2Fa",
      "/generations?provider=&model=x",
      `/generations?provider=openrouter&model=${"m".repeat(201)}`,
      "/generations/models?latest=5",
      "/generations/models?latest=-1",
      "/generations/models?latest=abc",
    ]) {
      const res = await get(path);
      expect(res.status, path).toBe(400);
      expect(ErrorResponse.parse(await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("lists models by latest id desc with exact counts and at most `latest` newest-first items", async () => {
    const a = [seed("x/a"), seed("x/a"), seed("x/a"), seed("x/a"), seed("x/a"), seed("x/a")];
    const b = [seed("x/b"), seed("x/b")];
    const c = seed("x/c");
    const a2 = seed("x/a"); // x/a is now the most recently used
    const none = await models();
    expect(none.map((g) => [g.model, g.count, g.latestId, g.items])).toEqual([
      ["x/a", 7, a2, []],
      ["x/c", 1, c, []],
      ["x/b", 2, b[1], []],
    ]);
    const four = await models("?latest=4");
    expect(four.map((g) => g.items.length)).toEqual([4, 1, 2]);
    expect(four[0]?.items.map((i) => i.id)).toEqual([a2, a[5], a[4], a[3]]);
    expect(four[2]?.items.map((i) => i.id)).toEqual([b[1], b[0]]);
    expect((await models("?latest=0"))[0]?.items).toEqual([]);
    expect((await models("?latest=2"))[0]?.items).toHaveLength(2);
  });

  it("each count equals the number of generations paging that model returns", async () => {
    for (const m of ["x/a", "x/b", "x/a", "x/c", "x/a", "x/b"]) seed(m);
    seed("x/a", "vercel");
    for (const g of await models()) {
      let n = 0;
      let cursor: string | null = null;
      do {
        const page: GenerationPage = GenerationPage.parse(
          await (await get(q(g.provider, g.model, `&limit=2${cursor ? `&cursor=${cursor}` : ""}`))).json(),
        );
        n += page.items.length;
        cursor = page.nextCursor;
      } while (cursor);
      expect(n, `${g.provider} ${g.model}`).toBe(g.count);
    }
  });

  it("a deleted generation leaves its group; a model with none left disappears", async () => {
    const a1 = seed("x/a");
    const a2 = seed("x/a");
    const b = seed("x/b");
    expect((await t.app.request(`/api/generations/${a2}`, { method: "DELETE" })).status).toBe(204);
    expect((await models("?latest=4")).map((g) => [g.model, g.count, g.items.map((i) => i.id)])).toEqual([
      ["x/b", 1, [b]],
      ["x/a", 1, [a1]],
    ]);
    expect((await t.app.request(`/api/generations/${a1}`, { method: "DELETE" })).status).toBe(204);
    expect((await models()).map((g) => g.model)).toEqual(["x/b"]);
    expect(GenerationPage.parse(await (await get(q("openrouter", "x/a"))).json()).items).toEqual([]);
  });

  it("refuses another site's request for the filtered list and the models read", async () => {
    seed("x/a");
    const foreign = { origin: "https://evil.example", "sec-fetch-site": "cross-site" };
    expect((await get(q("openrouter", "x/a"), foreign)).status).toBe(403);
    expect((await get("/generations/models", foreign)).status).toBe(403);
  });
});
