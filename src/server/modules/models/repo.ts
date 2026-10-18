import { z } from "zod";
import { ModelPreference } from "../../../shared/models";
import type { ProviderId } from "../../../shared/providers";
import type { Db } from "../../db/client";

const Row = z
  .object({
    provider: z.string(),
    model: z.string(),
    favorite: z.number().int(),
    hidden: z.number().int(),
    updated_at: z.string(),
  })
  .transform(
    (r): ModelPreference =>
      ModelPreference.parse({
        provider: r.provider,
        model: r.model,
        favorite: r.favorite === 1,
        hidden: r.hidden === 1,
        updatedAt: r.updated_at,
      }),
  );

export type PreferenceFlags = { favorite?: boolean; hidden?: boolean };

export function createModelsRepo(db: Db, now: () => number = Date.now) {
  const listStmt = db.prepare("SELECT * FROM model_preferences WHERE provider = ? ORDER BY model");
  const getStmt = db.prepare("SELECT * FROM model_preferences WHERE provider = ? AND model = ?");
  const upsertStmt = db.prepare(
    `INSERT INTO model_preferences (provider, model, favorite, hidden, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (provider, model) DO UPDATE SET favorite = excluded.favorite, hidden = excluded.hidden, updated_at = excluded.updated_at`,
  );
  const deleteStmt = db.prepare("DELETE FROM model_preferences WHERE provider = ? AND model = ?");

  return {
    list(provider: ProviderId): ModelPreference[] {
      return listStmt.all(provider).map((r) => Row.parse(r));
    },

    /** Merges the named flags into the stored row: upsert, or delete when both end off. */
    set(provider: ProviderId, model: string, flags: PreferenceFlags): ModelPreference {
      const stored = getStmt.get(provider, model);
      const current = stored ? Row.parse(stored) : undefined;
      const favorite = flags.favorite ?? current?.favorite ?? false;
      const hidden = flags.hidden ?? current?.hidden ?? false;
      if (!favorite && !hidden) {
        deleteStmt.run(provider, model);
        return { provider, model, favorite, hidden, updatedAt: null };
      }
      const updatedAt = new Date(now()).toISOString();
      upsertStmt.run(provider, model, favorite ? 1 : 0, hidden ? 1 : 0, updatedAt);
      return { provider, model, favorite, hidden, updatedAt };
    },
  };
}

export type ModelsRepo = ReturnType<typeof createModelsRepo>;
