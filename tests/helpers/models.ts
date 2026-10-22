import type { Db } from "../../src/server/db/client";

/** Inserts a model_preferences row directly (bypasses the catalog check). At least one flag must be on. */
export function seedModelPreference(
  db: Db,
  {
    provider,
    model,
    favorite = false,
    hidden = false,
  }: { provider: string; model: string; favorite?: boolean; hidden?: boolean },
) {
  db.prepare(
    "INSERT INTO model_preferences (provider, model, favorite, hidden, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(provider, model, favorite ? 1 : 0, hidden ? 1 : 0, new Date().toISOString());
}
