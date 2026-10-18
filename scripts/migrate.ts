import { openDb } from "../src/server/db/client";
import { migrateDown, migrateUp } from "../src/server/db/migrate";
import { loadConfig } from "../src/server/lib/config";

const direction = process.argv[2];
if (direction !== "up" && direction !== "down") {
  console.error("usage: tsx scripts/migrate.ts <up|down>");
  process.exit(1);
}

const config = loadConfig();
const db = openDb(config.dataDir);
try {
  if (direction === "up") {
    const applied = migrateUp(db);
    console.log(applied.length ? `applied: ${applied.map((m) => `${m.version}_${m.name}`).join(", ")}` : "up to date");
  } else {
    const reverted = migrateDown(db);
    console.log(reverted ? `reverted: ${reverted.version}_${reverted.name}` : "nothing to revert");
  }
} finally {
  db.close();
}
