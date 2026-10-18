import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../../../tests/helpers/test-app";
import { type Db, openDb } from "./client";
import { appliedVersions, listMigrations, migrateDown, migrateUp } from "./migrate";

describe("migration runner", () => {
  let dir: string;
  let db: Db;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "gen-img-migrate-"));
    db = openDb(dir);
  });
  afterEach(() => {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("applies → rolls back → re-applies the repo migrations; re-running up is a no-op", () => {
    expect(migrateUp(db).map((m) => m.version)).toEqual(["0001", "0002", "0003"]);
    expect(appliedVersions(db)).toEqual(["0001", "0002", "0003"]);
    expect(migrateUp(db)).toEqual([]);

    expect(migrateDown(db)?.version).toBe("0003");
    expect(migrateDown(db)?.version).toBe("0002");
    expect(migrateDown(db)?.version).toBe("0001");
    expect(appliedVersions(db)).toEqual([]);
    expect(migrateDown(db)).toBeUndefined();

    expect(migrateUp(db).map((m) => m.version)).toEqual(["0001", "0002", "0003"]);
  });

  it("0003 serves the image-by-path lookup from an index, not a table scan", () => {
    migrateUp(db);
    const plan = db
      .prepare("EXPLAIN QUERY PLAN SELECT media_type FROM generation_images WHERE path = ?")
      .all("generations/x/output-1.png") as { detail: string }[];
    expect(plan.map((p) => p.detail).join(" ")).toMatch(/USING (COVERING )?INDEX generation_images_path/);
  });

  it("0002_create_generations enforces the generation invariants and reverts cleanly", () => {
    migrateUp(db);
    const insert = db.prepare(
      `INSERT INTO generations (id, provider, model, prompt, requested_params, accepted_params, images_requested,
         cost_micros, cost_status, created_at, duration_ms, raw_request, raw_response)
       VALUES (@id, 'openrouter', 'm', @prompt, '{}', NULL, 1, @cost, @status, '2026-10-18T00:00:00.000Z', 10, '{}', '{}')`,
    );
    insert.run({ id: "01A", prompt: "ok", cost: 40000, status: "known" });
    insert.run({ id: "01B", prompt: "ok", cost: null, status: "unavailable" });
    expect(() => insert.run({ id: "01C", prompt: "   ", cost: null, status: "unavailable" })).toThrow(/CHECK/);
    expect(() => insert.run({ id: "01D", prompt: "ok", cost: null, status: "known" })).toThrow(/CHECK/);
    expect(() => insert.run({ id: "01E", prompt: "ok", cost: 1, status: "free" })).toThrow(/CHECK/);

    const img = db.prepare(
      `INSERT INTO generation_images (generation_id, position, path, media_type, width, height, byte_size)
       VALUES (?, 1, ?, ?, 1, 1, 1)`,
    );
    img.run("01A", "generations/01A/output-1.png", "image/png");
    expect(() => img.run("01B", "generations/01B/output-1.svg", "image/svg+xml")).toThrow(/CHECK/);
    expect(() => img.run("nope", "generations/nope/output-1.png", "image/png")).toThrow(/FOREIGN KEY/);
    db.prepare("DELETE FROM generations WHERE id = '01A'").run();
    expect(db.prepare("SELECT count(*) FROM generation_images").pluck().get()).toBe(0);

    migrateDown(db);
    migrateDown(db);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'generation%'")
      .pluck()
      .all();
    expect(tables).toEqual([]);
  });

  it("runs up/down SQL and reverts only the latest migration", () => {
    const migDir = join(dir, "migrations");
    const files: Record<string, string> = {
      "0001_a.up.sql": "CREATE TABLE a (id TEXT PRIMARY KEY);",
      "0001_a.down.sql": "DROP TABLE a;",
      "0002_b.up.sql": "CREATE TABLE b (id TEXT PRIMARY KEY);",
      "0002_b.down.sql": "DROP TABLE b;",
    };
    mkdirSync(migDir);
    for (const [name, sql] of Object.entries(files)) writeFileSync(join(migDir, name), sql);

    const tables = () =>
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('a','b') ORDER BY name").pluck().all();

    migrateUp(db, migDir);
    expect(tables()).toEqual(["a", "b"]);
    migrateDown(db, migDir);
    expect(tables()).toEqual(["a"]);
    expect(appliedVersions(db)).toEqual(["0001"]);
  });

  it("rejects a migration missing its down half", () => {
    const migDir = mkdtempSync(join(tmpdir(), "gen-img-lone-"));
    writeFileSync(join(migDir, "0001_lonely.up.sql"), "SELECT 1;");
    expect(() => listMigrations(migDir)).toThrow(/missing its down file/);
    rmSync(migDir, { recursive: true, force: true });
  });

  it("the app's boot path leaves the database migrated", () => {
    const t = createTestApp();
    try {
      expect(appliedVersions(t.db)).toEqual(listMigrations().map((m) => m.version));
    } finally {
      t.cleanup();
    }
  });
});
