import { mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

export type Db = Database.Database;

export const DB_FILE = "gen-img.db";

/** Opens (creating if needed) `<dataDir>/gen-img.db` in WAL mode with foreign keys enforced. */
export function openDb(dataDir: string): Db {
  mkdirSync(dataDir, { recursive: true });
  const db = new Database(join(dataDir, DB_FILE));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}
