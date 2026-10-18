import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { CostHistory } from "../../../shared/pricing";

const id = (n: number) => `01CH${String(n).padStart(22, "0")}`;

describe("cost history of past generations", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  const get = async (provider: string, model: string) =>
    t.app.request(`/api/generations/cost-history?provider=${provider}&model=${encodeURIComponent(model)}`);

  it("averages known costs per received image over the last 20 generations of that provider and model only", async () => {
    // 22 known: the 2 oldest (cost 1 000 000) fall outside the last 20
    for (let i = 0; i < 22; i++)
      seedGeneration(t.db, t.dataDir, {
        id: id(i),
        provider: "openrouter",
        model: "x/tok",
        images: i % 2 === 0 ? 1 : 3,
        costMicros: i < 2 ? 1_000_000 : i % 2 === 0 ? 40_000 : 120_000,
        costStatus: "known",
      });
    seedGeneration(t.db, t.dataDir, {
      id: id(50),
      provider: "openrouter",
      model: "x/tok",
      costMicros: null,
      costStatus: "pending",
    });
    seedGeneration(t.db, t.dataDir, {
      id: id(51),
      provider: "openrouter",
      model: "x/tok",
      costMicros: null,
      costStatus: "unavailable",
    });
    seedGeneration(t.db, t.dataDir, {
      id: id(52),
      provider: "vercel",
      model: "x/tok",
      costMicros: 9_000_000,
      costStatus: "known",
    });
    seedGeneration(t.db, t.dataDir, {
      id: id(53),
      provider: "openrouter",
      model: "x/tok-2",
      costMicros: 9_000_000,
      costStatus: "known",
    });

    const res = await get("openrouter", "x/tok");
    expect(res.status).toBe(200);
    // last 20 = ids 2..21: 10 × (40 000 / 1 image) + 10 × (120 000 / 3 images) → 1 600 000 / 40 images = 40 000
    expect(CostHistory.parse(await res.json())).toEqual({ count: 20, perImageMicros: 40_000 });
  });

  it("says there is no history when nothing known matches", async () => {
    seedGeneration(t.db, t.dataDir, {
      id: id(1),
      provider: "openrouter",
      model: "x/tok",
      costMicros: null,
      costStatus: "unavailable",
    });
    expect(CostHistory.parse(await (await get("openrouter", "x/tok")).json())).toEqual({
      count: 0,
      perImageMicros: null,
    });
  });

  it("validates the query and refuses a foreign page", async () => {
    expect((await t.app.request("/api/generations/cost-history?provider=openrouter")).status).toBe(400);
    expect((await t.app.request("/api/generations/cost-history?provider=nope&model=x")).status).toBe(400);
    const foreign = await t.app.request("/api/generations/cost-history?provider=openrouter&model=x", {
      headers: { "sec-fetch-site": "cross-site" },
    });
    expect(foreign.status).toBe(403);
  });
});
