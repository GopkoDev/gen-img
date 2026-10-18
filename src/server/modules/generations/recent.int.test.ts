import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { ErrorResponse } from "../../../shared/errors";
import { GenerationPage } from "../../../shared/generations";

// Recent generations read the list with limit 10 (ADR-0025, spec AC-09, AC-13).
describe("recent generations through the list endpoint", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  it("limit=10 returns the ten newest, newest first, each with its first output as thumbnail", async () => {
    const ids = Array.from({ length: 12 }, () => seedGeneration(t.db, t.dataDir, { images: 2 }).id);
    const page = GenerationPage.parse(await (await t.app.request("/api/generations?limit=10")).json());
    expect(page.items.map((g) => g.id)).toEqual(ids.slice(2).reverse());
    expect(page.items.every((g) => g.thumbnail?.position === 1)).toBe(true);
  });

  it("with fewer than ten, returns all of them", async () => {
    seedGeneration(t.db, t.dataDir);
    seedGeneration(t.db, t.dataDir);
    const page = GenerationPage.parse(await (await t.app.request("/api/generations?limit=10")).json());
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBeNull();
  });

  it("refuses another site's request for the latest generations", async () => {
    const res = await t.app.request("/api/generations?limit=10", { headers: { "sec-fetch-site": "cross-site" } });
    expect(res.status).toBe(403);
    expect(ErrorResponse.parse(await res.json()).error.code).toBe("FORBIDDEN");
  });
});
