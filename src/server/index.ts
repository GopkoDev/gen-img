import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { openDb } from "./db/client";
import { migrateUp } from "./db/migrate";
import { loadConfig } from "./lib/config";

const HOST = "127.0.0.1"; // local-only by design: the API holds the provider keys' spending power

const config = loadConfig();
const db = openDb(config.dataDir);
const applied = migrateUp(db);
if (applied.length) console.log(`migrations applied: ${applied.map((m) => `${m.version}_${m.name}`).join(", ")}`);
const webDir = process.env.NODE_ENV === "production" && existsSync("dist/web") ? "dist/web" : undefined;
const app = createApp({ config, db }, { webDir });

serve({ fetch: app.fetch, hostname: HOST, port: config.port }, (info) => {
  console.log(`gen-img listening on http://${HOST}:${info.port}${webDir ? "" : " (API only)"}`);
});
