import { existsSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { CommentResponse, TagsResponse } from "../../../shared/curation";
import { ErrorResponse } from "../../../shared/errors";
import { Generation, GenerationPage } from "../../../shared/generations";

describe("curation routes", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  const send = (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) =>
    t.app.request(`/api${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });

  it("sets and clears the comment and shows it in the detail and the gallery", async () => {
    const g = seedGeneration(t.db, t.dataDir);
    const res = await send("PUT", `/generations/${g.id}/comment`, { body: "Warmer palette next" });
    expect(res.status).toBe(200);
    expect(CommentResponse.parse(await res.json()).comment?.body).toBe("Warmer palette next");
    const detail = Generation.parse(await (await t.app.request(`/api/generations/${g.id}`)).json());
    expect(detail.comment?.body).toBe("Warmer palette next");
    const page = GenerationPage.parse(await (await t.app.request("/api/generations")).json());
    expect(page.items[0]).toMatchObject({ hasComment: true, tags: [] });

    expect(
      CommentResponse.parse(await (await send("PUT", `/generations/${g.id}/comment`, { body: " " })).json()),
    ).toEqual({
      comment: null,
    });
    const tooLong = await send("PUT", `/generations/${g.id}/comment`, { body: "x".repeat(2001) });
    expect(tooLong.status).toBe(400);
    expect(ErrorResponse.parse(await tooLong.json()).error.details).toEqual({
      fields: { body: "Comment must be at most 2 000 characters" },
    });
    expect((await send("PUT", `/generations/${g.id}/comment`, "not json")).status).toBe(400);
  });

  it("adds and removes tags and reflects them in the detail and gallery", async () => {
    const g = seedGeneration(t.db, t.dataDir);
    expect(
      TagsResponse.parse(await (await send("POST", `/generations/${g.id}/tags`, { tag: " Neon  City" })).json()),
    ).toEqual({
      tags: ["neon city"],
    });
    await send("POST", `/generations/${g.id}/tags`, { tag: "кіт" });
    const page = GenerationPage.parse(await (await t.app.request("/api/generations")).json());
    expect(page.items[0]?.tags).toEqual(["neon city", "кіт"]);
    const removed = await send("DELETE", `/generations/${g.id}/tags/${encodeURIComponent("Neon City")}`);
    expect(TagsResponse.parse(await removed.json())).toEqual({ tags: ["кіт"] });
    const bad = await send("POST", `/generations/${g.id}/tags`, { tag: "<b>" });
    expect(bad.status).toBe(400);
    expect(Generation.parse(await (await t.app.request(`/api/generations/${g.id}`)).json()).tags).toEqual(["кіт"]);
  });

  it("deletes a generation and its files; a second delete is not found", async () => {
    const g = seedGeneration(t.db, t.dataDir, { images: 2, inputs: 1, tags: ["x"], comment: "y" });
    const res = await send("DELETE", `/generations/${g.id}`);
    expect(res.status).toBe(204);
    expect((await t.app.request(`/api/generations/${g.id}`)).status).toBe(404);
    expect((await t.app.request(`/api/files/${g.images[0]?.path}`)).status).toBe(404);
    expect(existsSync(join(t.dataDir, "generations", g.id))).toBe(false);
    expect((await send("DELETE", `/generations/${g.id}`)).status).toBe(404);
  });

  it("answers not found for every curation action on a missing generation", async () => {
    for (const [method, path, body] of [
      ["PUT", "/generations/GONE/comment", { body: "x" }],
      ["POST", "/generations/GONE/tags", { tag: "x" }],
      ["DELETE", "/generations/GONE/tags/x", undefined],
      ["DELETE", "/generations/GONE", undefined],
    ] as const) {
      const res = await send(method, path, body);
      expect(res.status).toBe(404);
      expect(ErrorResponse.parse(await res.json()).error.code).toBe("NOT_FOUND");
    }
  });

  it("refuses foreign pages on every mutating route and changes nothing", async () => {
    const g = seedGeneration(t.db, t.dataDir, { tags: ["keep"], comment: "keep" });
    const foreign = { origin: "https://evil.example", "sec-fetch-site": "cross-site" };
    for (const [method, path, body] of [
      ["PUT", `/generations/${g.id}/comment`, { body: "vandal" }],
      ["POST", `/generations/${g.id}/tags`, { tag: "spam" }],
      ["DELETE", `/generations/${g.id}/tags/keep`, undefined],
      ["DELETE", `/generations/${g.id}`, undefined],
    ] as const)
      expect((await send(method, path, body, foreign)).status).toBe(403);
    const detail = Generation.parse(await (await t.app.request(`/api/generations/${g.id}`)).json());
    expect(detail).toMatchObject({ tags: ["keep"], comment: { body: "keep" } });
  });
});
