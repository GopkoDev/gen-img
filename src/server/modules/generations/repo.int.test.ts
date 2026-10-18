import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { createGenerationsRepo } from "./repo";

describe("generations repo", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  it("round-trips every field of a generation and its images", () => {
    const seeded = seedGeneration(t.db, t.dataDir, {
      images: 2,
      imagesRequested: 4,
      costMicros: null,
      costStatus: "unavailable",
      requestedParams: { n: 4, aspectRatio: "16:9", seed: 7 },
    });
    const repo = createGenerationsRepo(t.db);
    expect(repo.get(seeded.id)).toEqual({
      ...seeded,
      images: seeded.images,
    });
    expect(repo.get("missing")).toBeUndefined();
  });

  it("pages newest first with a cursor and reports images requested vs received", () => {
    const ids = Array.from(
      { length: 30 },
      (_, i) => seedGeneration(t.db, t.dataDir, { id: `01PAGE${String(i).padStart(20, "0")}` }).id,
    );
    const repo = createGenerationsRepo(t.db);

    const first = repo.listPage({ limit: 24 });
    expect(first.items.map((g) => g.id)).toEqual([...ids].reverse().slice(0, 24));
    expect(first.nextCursor).toBe(ids[6]);
    expect(first.items[0]).toMatchObject({
      provider: "openrouter",
      imagesRequested: 1,
      imagesReceived: 1,
      thumbnail: { position: 1 },
    });

    const second = repo.listPage({ cursor: first.nextCursor ?? undefined, limit: 24 });
    expect(second.items.map((g) => g.id)).toEqual([...ids].reverse().slice(24));
    expect(second.nextCursor).toBeNull();

    expect(createGenerationsRepo(t.db).listPage({ limit: 24, cursor: ids[0] })).toEqual({
      items: [],
      nextCursor: null,
    });
  });

  it("rolls the rows back when committing the files throws", () => {
    const repo = createGenerationsRepo(t.db);
    const seeded = seedGeneration(t.db, t.dataDir);
    const gen = { ...seeded, id: "01ROLLBACK0000000000000000" };
    const images = seeded.images.map((i) => ({ ...i, path: i.path.replace(seeded.id, gen.id) }));
    expect(() =>
      repo.insertAtomic(gen, images, () => {
        throw new Error("rename failed");
      }),
    ).toThrow("rename failed");
    expect(repo.get(gen.id)).toBeUndefined();
    expect(t.db.prepare("SELECT count(*) FROM generation_images WHERE generation_id = ?").pluck().get(gen.id)).toBe(0);
  });

  it("stores input copies with the generation and reads them back in order", () => {
    const seeded = seedGeneration(t.db, t.dataDir, { inputs: 2 });
    const plain = seedGeneration(t.db, t.dataDir);
    const repo = createGenerationsRepo(t.db);
    expect(repo.get(seeded.id)?.inputs).toEqual(seeded.inputs);
    expect(seeded.inputs.map((i) => i.position)).toEqual([1, 2]);
    expect(repo.get(plain.id)?.inputs).toEqual([]);
    const page = repo.listPage({ limit: 24 });
    expect(page.items.find((g) => g.id === seeded.id)?.inputsCount).toBe(2);
    expect(page.items.find((g) => g.id === plain.id)?.inputsCount).toBe(0);
    expect(repo.recordedImage(seeded.inputs[1]?.path ?? "")).toEqual({ mediaType: "image/png" });
  });

  it("rolls input rows back with the generation", () => {
    const repo = createGenerationsRepo(t.db);
    const seeded = seedGeneration(t.db, t.dataDir, { inputs: 1 });
    const id = "01ROLLBACKIN00000000000000";
    const swap = <T extends { path: string }>(xs: T[]) =>
      xs.map((x) => ({ ...x, path: x.path.replace(seeded.id, id) }));
    expect(() =>
      repo.insertAtomic(
        { ...seeded, id },
        swap(seeded.images),
        () => {
          throw new Error("rename failed");
        },
        swap(seeded.inputs),
      ),
    ).toThrow("rename failed");
    expect(t.db.prepare("SELECT count(*) FROM generation_inputs WHERE generation_id = ?").pluck().get(id)).toBe(0);
  });

  it("knows which file paths are recorded and lists all ids", () => {
    const seeded = seedGeneration(t.db, t.dataDir);
    const repo = createGenerationsRepo(t.db);
    expect(repo.recordedImage(seeded.images[0]?.path ?? "")).toEqual({ mediaType: "image/png" });
    expect(repo.recordedImage("generations/x/output-1.png")).toBeUndefined();
    expect(repo.allIds()).toEqual([seeded.id]);
  });

  it("keeps the cost reference, lists pending costs with their answer time, and resolves only pending ones", () => {
    const pending = seedGeneration(t.db, t.dataDir, {
      provider: "vercel",
      costMicros: null,
      costStatus: "pending",
      costRef: "gen_01REF",
      createdAt: "2026-10-18T12:00:00.000Z",
      durationMs: 9000,
    });
    seedGeneration(t.db, t.dataDir); // a known OpenRouter cost is never listed
    const repo = createGenerationsRepo(t.db);
    expect(repo.get(pending.id)).toMatchObject({ costRef: "gen_01REF", costStatus: "pending", costMicros: null });
    expect(repo.listPendingCosts()).toEqual([
      { id: pending.id, provider: "vercel", costRef: "gen_01REF", answeredAt: Date.parse("2026-10-18T12:00:09.000Z") },
    ]);

    expect(repo.resolveCost(pending.id, 67000)).toBe(true);
    expect(repo.get(pending.id)).toMatchObject({ costStatus: "known", costMicros: 67000, costRef: "gen_01REF" });
    expect(repo.resolveCost(pending.id, null)).toBe(false); // late or duplicate lookup: no-op
    expect(repo.get(pending.id)).toMatchObject({ costStatus: "known", costMicros: 67000 });
    expect(repo.listPendingCosts()).toEqual([]);

    const other = seedGeneration(t.db, t.dataDir, { costMicros: null, costStatus: "pending", costRef: null });
    expect(repo.resolveCost(other.id, null)).toBe(true);
    expect(repo.get(other.id)).toMatchObject({ costStatus: "unavailable", costMicros: null });
  });
});
