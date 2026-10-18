import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type AppDeps, createApp } from "../../src/server/app";
import { openDb } from "../../src/server/db/client";
import { migrateUp } from "../../src/server/db/migrate";
import type { Config } from "../../src/server/lib/config";

/** A real app over a real SQLite file in a fresh temp data dir, migrated like on boot. Call `cleanup()` after. */
export function createTestApp(overrides: Partial<Config> = {}, deps: Omit<Partial<AppDeps>, "config" | "db"> = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), "gen-img-test-"));
  const config: Config = {
    openRouterApiKey: undefined,
    aiGatewayApiKey: undefined,
    dataDir,
    port: 0,
    ...overrides,
  };
  const db = openDb(dataDir);
  migrateUp(db);
  const app = createApp({ config, db, ...deps });
  return {
    app,
    db,
    dataDir,
    cleanup() {
      db.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}
