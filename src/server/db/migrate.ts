import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "./client";

export const MIGRATIONS_DIR = fileURLToPath(new URL("../../../migrations", import.meta.url));

const FILE_RE = /^(\d{4})_([a-z0-9_]+)\.(up|down)\.sql$/;

export type Migration = { version: string; name: string; upPath: string; downPath: string };

/** Reads `NNNN_snake_name.up.sql` / `.down.sql` pairs, sorted by version; a lone half is an error. */
export function listMigrations(dir: string = MIGRATIONS_DIR): Migration[] {
  const byVersion = new Map<string, { name: string; up?: string; down?: string }>();
  for (const file of readdirSync(dir)) {
    const m = FILE_RE.exec(file);
    if (!m) continue;
    const [, version, name, kind] = m as unknown as [string, string, string, "up" | "down"];
    const entry = byVersion.get(version) ?? { name };
    if (entry.name !== name) throw new Error(`Migration ${version} has mismatched names: ${entry.name} / ${name}`);
    entry[kind] = join(dir, file);
    byVersion.set(version, entry);
  }
  return [...byVersion.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([version, e]) => {
      if (!e.up || !e.down)
        throw new Error(`Migration ${version}_${e.name} is missing its ${e.up ? "down" : "up"} file`);
      return { version, name: e.name, upPath: e.up, downPath: e.down };
    });
}

function ensureTable(db: Db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`);
}

export function appliedVersions(db: Db): string[] {
  ensureTable(db);
  return db.prepare("SELECT version FROM schema_migrations ORDER BY version").pluck().all() as string[];
}

/** Applies every pending `up` in one transaction; returns the applied migrations (empty = already up to date). */
export function migrateUp(db: Db, dir: string = MIGRATIONS_DIR): Migration[] {
  const applied = new Set(appliedVersions(db));
  const pending = listMigrations(dir).filter((m) => !applied.has(m.version));
  const record = db.prepare("INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)");
  db.transaction(() => {
    for (const m of pending) {
      db.exec(readFileSync(m.upPath, "utf8"));
      record.run(m.version, m.name, new Date().toISOString());
    }
  })();
  return pending;
}

/** Reverts the latest applied migration via its `down` file; returns it, or undefined when nothing is applied. */
export function migrateDown(db: Db, dir: string = MIGRATIONS_DIR): Migration | undefined {
  const latest = appliedVersions(db).at(-1);
  if (!latest) return undefined;
  const m = listMigrations(dir).find((x) => x.version === latest);
  if (!m) throw new Error(`Applied migration ${latest} has no files in ${dir}`);
  db.transaction(() => {
    db.exec(readFileSync(m.downPath, "utf8"));
    db.prepare("DELETE FROM schema_migrations WHERE version = ?").run(m.version);
  })();
  return m;
}
