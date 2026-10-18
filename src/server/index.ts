import { existsSync } from "node:fs";
import { serve } from "@hono/node-server";
import { createApp } from "./app";
import { openDb } from "./db/client";
import { migrateUp } from "./db/migrate";
import { HOST, loadConfig } from "./lib/config";

const config = loadConfig();
const db = openDb(config.dataDir);
const applied = migrateUp(db);
if (applied.length) console.log(`migrations applied: ${applied.map((m) => `${m.version}_${m.name}`).join(", ")}`);
const webDir = process.env.NODE_ENV === "production" && existsSync("dist/web") ? "dist/web" : undefined;
const app = createApp({ config, db }, { webDir });

const server = serve({ fetch: app.fetch, hostname: HOST, port: config.port }, (info) => {
  console.log(`Ukiyo listening on http://${HOST}:${info.port}${webDir ? "" : " (API only)"}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    app.stopBackground(); // no cost lookups against a closing DB
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
