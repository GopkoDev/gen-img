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
    expect(migrateUp(db).map((m) => m.version)).toEqual(["0001"]);
    expect(appliedVersions(db)).toEqual(["0001"]);
    expect(migrateUp(db)).toEqual([]);

    expect(migrateDown(db)?.version).toBe("0001");
    expect(appliedVersions(db)).toEqual([]);
    expect(migrateDown(db)).toBeUndefined();

    expect(migrateUp(db).map((m) => m.version)).toEqual(["0001"]);
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
