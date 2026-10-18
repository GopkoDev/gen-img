import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { createGenerationsRepo } from "./repo";

const id = (n: number) => `01LIN${String(n).padStart(21, "0")}`;

describe("generations repo — lineage and stored images", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  it("round-trips the source of a derived generation", () => {
    const src = seedGeneration(t.db, t.dataDir, { id: id(1), images: 2 });
    seedGeneration(t.db, t.dataDir, { id: id(2), sourceId: src.id, sourceRelation: "reuse", sourceOutput: 2 });
    const repo = createGenerationsRepo(t.db);
    expect(repo.get(id(2))).toMatchObject({ sourceId: id(1), sourceRelation: "reuse", sourceOutput: 2 });
    expect(repo.get(id(1))).toMatchObject({ sourceId: null, sourceRelation: null, sourceOutput: null });
  });

  it("lists the newest derived generations (at most 50) with the total, one level only", () => {
    seedGeneration(t.db, t.dataDir, { id: id(1) });
    for (let i = 2; i <= 54; i++)
      seedGeneration(t.db, t.dataDir, { id: id(i), sourceId: id(1), sourceRelation: "rerun" });
    seedGeneration(t.db, t.dataDir, { id: id(60), sourceId: id(54), sourceRelation: "rerun" }); // grandchild
    const repo = createGenerationsRepo(t.db);
    const derived = repo.derivedOf(id(1));
    expect(derived.total).toBe(53);
    expect(derived.items).toHaveLength(50);
    expect(derived.items[0]).toMatchObject({
      id: id(54),
      relation: "rerun",
      output: null,
      createdAt: expect.any(String),
    });
    expect(derived.items.map((d) => d.id)).not.toContain(id(60));
    expect(repo.derivedOf(id(54))).toEqual({ items: [expect.objectContaining({ id: id(60) })], total: 1 });
    expect(repo.derivedOf(id(60))).toEqual({ items: [], total: 0 });
  });

  it("keeps a derived generation unchanged when its source is deleted", () => {
    seedGeneration(t.db, t.dataDir, { id: id(1) });
    const child = seedGeneration(t.db, t.dataDir, { id: id(2), sourceId: id(1), sourceRelation: "rerun", inputs: 1 });
    const repo = createGenerationsRepo(t.db);
    expect(repo.exists(id(1))).toBe(true);
    repo.deleteAtomic(id(1), () => {});
    expect(repo.exists(id(1))).toBe(false);
    expect(repo.get(id(2))).toMatchObject({ sourceId: id(1), inputs: child.inputs, images: child.images });
  });

  it("resolves a stored image only by generation, kind and an existing position", () => {
    const g = seedGeneration(t.db, t.dataDir, { id: id(1), images: 2, inputs: 1 });
    const repo = createGenerationsRepo(t.db);
    expect(repo.storedImage(g.id, "output", 2)).toEqual({
      path: g.images[1]?.path,
      mediaType: "image/png",
      name: "output-2.png",
    });
    expect(repo.storedImage(g.id, "input", 1)).toEqual({
      path: g.inputs[0]?.path,
      mediaType: "image/png",
      name: "cat.png",
    });
    expect(repo.storedImage(g.id, "output", 3)).toBeUndefined();
    expect(repo.storedImage(g.id, "input", 2)).toBeUndefined();
    expect(repo.storedImage("01NOPE", "output", 1)).toBeUndefined();
  });
});
