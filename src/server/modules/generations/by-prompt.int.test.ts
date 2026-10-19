import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { GenerationPage, PromptGroup, PromptGroupPage } from "../../../shared/generations";
import { promptKey } from "./promptKey";

// gallery-by-prompt: prompt groups, one group, a prompt's pages (spec AC-01, AC-02, AC-05, AC-06, AC-07, AC-09; SAD §8; ADR-0038).
describe("gallery by prompt", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  const get = (path: string, headers?: Record<string, string>) => t.app.request(`/api${path}`, { headers });
  const seed = (prompt: string, extra: Parameters<typeof seedGeneration>[2] = {}) =>
    seedGeneration(t.db, t.dataDir, { prompt, ...extra }).id;
  const groups = async (query = "") => {
    const res = await get(`/generations/prompts${query}`);
    expect(res.status, query).toBe(200);
    return PromptGroupPage.parse(await res.json());
  };

  it("groups by the exact text: case, space and line-break variants are separate groups", async () => {
    const variants = ["a cat", "A cat", "a cat ", "a cat\n", "a  cat"];
    for (const p of variants) {
      seed(p);
      seed(p);
    }
    const page = await groups();
    expect(page.groups).toHaveLength(5);
    expect(new Set(page.groups.map((g) => g.key))).toEqual(new Set(variants.map(promptKey)));
    expect(page.groups.every((g) => g.count === 2)).toBe(true);
  });

  it("is one group whatever the model or provider; images is the sum received", async () => {
    seed("same", { model: "x/a", images: 2 });
    seed("same", { model: "x/b", provider: "vercel", images: 3 });
    const [g] = (await groups()).groups;
    expect(g?.count).toBe(2);
    expect(g?.images).toBe(5);
  });

  it("hides single-use prompts by default and includes them with single=1", async () => {
    seed("reused");
    seed("reused");
    seed("once");
    expect((await groups()).groups.map((g) => g.prompt)).toEqual(["reused"]);
    expect((await groups("?single=0")).groups.map((g) => g.prompt)).toEqual(["reused"]);
    expect((await groups("?single=1")).groups.map((g) => g.prompt)).toEqual(["once", "reused"]);
  });

  it("orders groups by latest id desc and pages by the last latestId without duplicates or skips", async () => {
    for (let i = 0; i < 6; i++) {
      seed(`p${i}`);
      seed(`p${i}`);
    }
    // p3 is re-run last: it moves to the top.
    seed("p3");
    const first = await groups("?limit=4");
    expect(first.groups.map((g) => g.prompt)).toEqual(["p3", "p5", "p4", "p2"]);
    expect(first.nextCursor).toBe(first.groups[3]?.latestId);
    // an older prompt gets a new generation between page reads: it jumps to the top, so it never shows up on page 2
    seed("p0");
    const second = await groups(`?limit=4&cursor=${first.nextCursor}`);
    expect(second.groups.map((g) => g.prompt)).toEqual(["p1"]);
    expect((await groups("?limit=1")).groups.map((g) => g.prompt)).toEqual(["p0"]);
    expect(second.nextCursor).toBeNull();
    const all = [...first.groups, ...second.groups].map((g) => g.prompt);
    expect(new Set(all).size).toBe(all.length);
  });

  it("names up to the 3 most recently used models and counts the rest", async () => {
    seed("m", { model: "x/a" });
    seed("m", { model: "x/b" });
    seed("m", { model: "x/a", provider: "vercel" });
    seed("m", { model: "x/c" });
    seed("m", { model: "x/b" });
    const [g] = (await groups()).groups;
    expect(g?.models).toEqual([
      { provider: "openrouter", model: "x/b" },
      { provider: "openrouter", model: "x/c" },
      { provider: "vercel", model: "x/a" },
    ]);
    expect(g?.moreModels).toBe(1);
    seed("one", { model: "x/a" });
    seed("one", { model: "x/a" });
    const one = (await groups()).groups.find((x) => x.prompt === "one");
    expect(one?.models).toHaveLength(1);
    expect(one?.moreModels).toBe(0);
  });

  it("the cover is the first output of the latest generation and follows when that one is deleted", async () => {
    const a = seed("c", { images: 2 });
    const b = seed("c", { images: 2 });
    let [g] = (await groups()).groups;
    expect(g?.latestId).toBe(b);
    expect(g?.cover.url).toBe(`/api/files/generations/${b}/output-1.png`);
    expect(g?.cover).toMatchObject({ width: 4, height: 3 });
    expect((await t.app.request(`/api/generations/${b}`, { method: "DELETE" })).status).toBe(204);
    [g] = (await groups("?single=1")).groups;
    expect(g?.latestId).toBe(a);
    expect(g?.cover.url).toBe(`/api/files/generations/${a}/output-1.png`);
    expect(g?.count).toBe(1);
  });

  it("returns one group by key, single-use included, or 404 NOT_FOUND", async () => {
    const id = seed("lonely");
    const res = await get(`/generations/prompts/${promptKey("lonely")}`);
    expect(res.status).toBe(200);
    const g = PromptGroup.parse(await res.json());
    expect(g).toMatchObject({ key: promptKey("lonely"), prompt: "lonely", count: 1, latestId: id });
    const miss = await get(`/generations/prompts/${promptKey("nope")}`);
    expect(miss.status).toBe(404);
    expect(ErrorResponse.parse(await miss.json()).error.code).toBe("NOT_FOUND");
  });

  it("pages one prompt's generations newest first; an unknown key is an empty page", async () => {
    const ids = [seed("x"), seed("y"), seed("x"), seed("x")];
    const key = promptKey("x");
    const first = GenerationPage.parse(await (await get(`/generations?prompt=${key}&limit=2`)).json());
    expect(first.items.map((g) => g.id)).toEqual([ids[3], ids[2]]);
    expect(first.nextCursor).toBe(ids[2]);
    const second = GenerationPage.parse(
      await (await get(`/generations?prompt=${key}&limit=2&cursor=${first.nextCursor}`)).json(),
    );
    expect(second.items.map((g) => g.id)).toEqual([ids[0]]);
    expect(second.nextCursor).toBeNull();
    const none = await get(`/generations?prompt=${promptKey("unknown")}`);
    expect(none.status).toBe(200);
    expect(await none.json()).toEqual({ items: [], nextCursor: null });
  });

  it("rejects a prompt with provider/model, and malformed key / cursor / single, with VALIDATION_ERROR (400)", async () => {
    const key = promptKey("x");
    for (const path of [
      `/generations?prompt=${key}&provider=openrouter&model=x%2Fa`,
      `/generations?prompt=${key}&provider=openrouter`,
      "/generations?prompt=abc",
      `/generations?prompt=${key.toUpperCase()}`,
      `/generations?prompt=${key}0`,
      "/generations/prompts/abc",
      `/generations/prompts/${key.toUpperCase()}`,
      "/generations/prompts?cursor=not-an-id!",
      "/generations/prompts?single=2",
      "/generations/prompts?single=yes",
      "/generations/prompts?limit=0",
      "/generations/prompts?limit=101",
    ]) {
      const res = await get(path);
      expect(res.status, path).toBe(400);
      expect(ErrorResponse.parse(await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("refuses another site's request on all three reads", async () => {
    seed("x");
    const key = promptKey("x");
    const foreign = { origin: "https://evil.example", "sec-fetch-site": "cross-site" };
    for (const path of [`/generations?prompt=${key}`, "/generations/prompts", `/generations/prompts/${key}`])
      expect((await get(path, foreign)).status, path).toBe(403);
  });
});
