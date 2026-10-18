import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { seedGeneration } from "../../../../tests/helpers/generations";
import { createTestApp } from "../../../../tests/helpers/test-app";
import { createGenerationsRepo } from "./repo";

const NOW = "2026-10-18T12:00:00.000Z";

describe("generations repo — curation", () => {
  let t: ReturnType<typeof createTestApp>;
  beforeEach(() => {
    t = createTestApp();
  });
  afterEach(() => t.cleanup());

  it("sets, replaces and removes the comment", () => {
    const g = seedGeneration(t.db, t.dataDir);
    const repo = createGenerationsRepo(t.db);
    expect(repo.setComment(g.id, "First\nline", NOW)).toEqual({
      status: "ok",
      comment: { body: "First\nline", updatedAt: NOW },
    });
    expect(repo.setComment(g.id, "Second", NOW)).toMatchObject({ comment: { body: "Second" } });
    expect(repo.get(g.id)?.comment).toEqual({ body: "Second", updatedAt: NOW });
    expect(repo.setComment(g.id, null, NOW)).toEqual({ status: "ok", comment: null });
    expect(repo.get(g.id)?.comment).toBeNull();
    expect(repo.setComment("MISSING", "x", NOW)).toEqual({ status: "missing" });
  });

  it("adds tags in order, ignores duplicates, refuses the 11th, removes one", () => {
    const g = seedGeneration(t.db, t.dataDir);
    const repo = createGenerationsRepo(t.db);
    expect(repo.addTag(g.id, "portrait")).toEqual({ status: "added", tags: ["portrait"] });
    expect(repo.addTag(g.id, "neon city")).toEqual({ status: "added", tags: ["portrait", "neon city"] });
    expect(repo.addTag(g.id, "portrait")).toEqual({ status: "duplicate", tags: ["portrait", "neon city"] });
    for (let i = 3; i <= 10; i++) repo.addTag(g.id, `t${i}`);
    expect(repo.addTag(g.id, "eleven")).toMatchObject({ status: "limit" });
    expect(repo.get(g.id)?.tags).toHaveLength(10);
    expect(repo.removeTag(g.id, "neon city")).toMatchObject({
      status: "ok",
      tags: expect.not.arrayContaining(["neon city"]),
    });
    expect(repo.addTag(g.id, "again")).toMatchObject({ status: "added" });
    expect(repo.get(g.id)?.tags.at(-1)).toBe("again"); // position keeps growing — insertion order
    expect(repo.addTag("MISSING", "x")).toEqual({ status: "missing" });
    expect(repo.removeTag("MISSING", "x")).toEqual({ status: "missing" });
  });

  it("puts tags and a comment marker on gallery summaries", () => {
    const a = seedGeneration(t.db, t.dataDir);
    const b = seedGeneration(t.db, t.dataDir);
    const repo = createGenerationsRepo(t.db);
    repo.addTag(a.id, "one");
    repo.addTag(a.id, "two");
    repo.setComment(a.id, "note", NOW);
    const items = repo.listPage({ limit: 24 }).items;
    expect(items.find((i) => i.id === a.id)).toMatchObject({ tags: ["one", "two"], hasComment: true });
    expect(items.find((i) => i.id === b.id)).toMatchObject({ tags: [], hasComment: false });
  });

  it("deletes a generation with its children atomically and rolls back when moving the files fails", () => {
    const g = seedGeneration(t.db, t.dataDir, { images: 2, inputs: 1 });
    const repo = createGenerationsRepo(t.db);
    repo.addTag(g.id, "doomed");
    repo.setComment(g.id, "bye", NOW);

    expect(() =>
      repo.deleteAtomic(g.id, () => {
        throw new Error("EACCES");
      }),
    ).toThrow("EACCES");
    expect(repo.get(g.id)).toMatchObject({ tags: ["doomed"], comment: { body: "bye" } });

    let moved = 0;
    expect(repo.deleteAtomic(g.id, () => moved++)).toBe(true);
    expect(moved).toBe(1);
    expect(repo.get(g.id)).toBeUndefined();
    for (const table of ["generation_images", "generation_inputs", "generation_tags", "generation_comments"])
      expect(t.db.prepare(`SELECT count(*) FROM ${table}`).pluck().get()).toBe(0);

    expect(repo.deleteAtomic(g.id, () => moved++)).toBe(false);
    expect(moved).toBe(1); // nothing to move for a missing generation
  });
});
