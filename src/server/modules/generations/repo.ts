import { z } from "zod";
import { MAX_TAGS } from "../../../shared/curation";
import { RequestedParams } from "../../../shared/generations";
import type { Db } from "../../db/client";

const CostStatus = z.enum(["known", "pending", "unavailable"]);
const ImageMediaType = z.enum(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const json = <T extends z.ZodType>(schema: T) => z.string().transform((s) => schema.parse(JSON.parse(s)) as z.infer<T>);

const ImageRow = z
  .object({
    position: z.number().int(),
    path: z.string(),
    media_type: ImageMediaType,
    width: z.number().int(),
    height: z.number().int(),
    byte_size: z.number().int(),
  })
  .transform((r) => ({
    position: r.position,
    path: r.path,
    mediaType: r.media_type,
    width: r.width,
    height: r.height,
    byteSize: r.byte_size,
  }));
export type ImageRecord = z.infer<typeof ImageRow>;

const InputRow = z
  .object({
    position: z.number().int(),
    path: z.string(),
    media_type: ImageMediaType,
    width: z.number().int(),
    height: z.number().int(),
    byte_size: z.number().int(),
    original_name: z.string().nullable(),
  })
  .transform((r) => ({
    position: r.position,
    path: r.path,
    mediaType: r.media_type,
    width: r.width,
    height: r.height,
    byteSize: r.byte_size,
    originalName: r.original_name,
  }));
export type InputRecord = z.infer<typeof InputRow>;

const GenerationRow = z
  .object({
    id: z.string(),
    provider: z.string(),
    model: z.string(),
    prompt: z.string(),
    requested_params: json(RequestedParams),
    accepted_params: z
      .string()
      .nullable()
      .transform((s) => (s === null ? null : (JSON.parse(s) as Record<string, unknown>))),
    images_requested: z.number().int(),
    cost_micros: z.number().int().nullable(),
    cost_status: CostStatus,
    cost_ref: z.string().nullable(),
    created_at: z.string(),
    duration_ms: z.number().int(),
    raw_request: json(z.unknown()),
    raw_response: json(z.unknown()),
    source_id: z.string().nullable(),
    source_relation: z.enum(["rerun", "reuse"]).nullable(),
    source_output: z.number().int().nullable(),
  })
  .transform((r) => ({
    id: r.id,
    provider: r.provider,
    model: r.model,
    prompt: r.prompt,
    requestedParams: r.requested_params,
    acceptedParams: r.accepted_params,
    imagesRequested: r.images_requested,
    costMicros: r.cost_micros,
    costStatus: r.cost_status,
    costRef: r.cost_ref,
    createdAt: r.created_at,
    durationMs: r.duration_ms,
    rawRequest: r.raw_request,
    rawResponse: r.raw_response,
    sourceId: r.source_id,
    sourceRelation: r.source_relation,
    sourceOutput: r.source_output,
  }));

type StoredGeneration = z.infer<typeof GenerationRow>;
/** A generation to insert; `costRef` is only set when the price will be looked up later (ADR-0013). */
export type NewGeneration = Omit<StoredGeneration, "costRef" | "sourceId" | "sourceRelation" | "sourceOutput"> & {
  costRef?: string | null;
  /** Lineage (ADR-0018): set only when the source existed when generating started. */
  sourceId?: string | null;
  sourceRelation?: "rerun" | "reuse" | null;
  sourceOutput?: number | null;
};

/** A recorded image a start request may name (ADR-0017): where it lives and the name to show/send. */
export type StoredImage = { path: string; mediaType: string; name: string };
export type DerivedRecord = {
  id: string;
  relation: "rerun" | "reuse";
  output: number | null;
  createdAt: string;
  prompt: string;
};
export type CommentRecord = { body: string; updatedAt: string };
export type GenerationRecord = StoredGeneration & {
  images: ImageRecord[];
  inputs: InputRecord[];
  comment: CommentRecord | null;
  tags: string[];
};

/** A generation whose price is still to be looked up; `answeredAt` (epoch ms) starts its 10-minute deadline. */
export type PendingCost = { id: string; provider: string; costRef: string | null; answeredAt: number };

const SummaryRow = z
  .object({
    id: z.string(),
    provider: z.string(),
    model: z.string(),
    prompt: z.string(),
    created_at: z.string(),
    cost_micros: z.number().int().nullable(),
    cost_status: CostStatus,
    images_requested: z.number().int(),
    images_received: z.number().int(),
    inputs_count: z.number().int(),
    duration_ms: z.number().int().min(0),
  })
  .transform((r) => ({
    id: r.id,
    provider: r.provider,
    model: r.model,
    prompt: r.prompt,
    createdAt: r.created_at,
    costMicros: r.cost_micros,
    costStatus: r.cost_status,
    imagesRequested: r.images_requested,
    imagesReceived: r.images_received,
    inputsCount: r.inputs_count,
    durationMs: r.duration_ms,
  }));
export type GenerationSummaryRecord = z.infer<typeof SummaryRow> & {
  thumbnail: ImageRecord;
  tags: string[];
  hasComment: boolean;
};

const CommentRow = z
  .object({ body: z.string(), updated_at: z.string() })
  .transform((r) => ({ body: r.body, updatedAt: r.updated_at }));
const TagRow = z.object({ generation_id: z.string(), tag: z.string() });

export function createGenerationsRepo(db: Db) {
  const insertGen = db.prepare(
    `INSERT INTO generations (id, provider, model, prompt, requested_params, accepted_params, images_requested,
       cost_micros, cost_status, cost_ref, created_at, duration_ms, raw_request, raw_response,
       source_id, source_relation, source_output)
     VALUES (@id, @provider, @model, @prompt, @requestedParams, @acceptedParams, @imagesRequested,
       @costMicros, @costStatus, @costRef, @createdAt, @durationMs, @rawRequest, @rawResponse,
       @sourceId, @sourceRelation, @sourceOutput)`,
  );
  const insertImage = db.prepare(
    `INSERT INTO generation_images (generation_id, position, path, media_type, width, height, byte_size)
     VALUES (@generationId, @position, @path, @mediaType, @width, @height, @byteSize)`,
  );
  const selectGen = db.prepare("SELECT * FROM generations WHERE id = ?");
  const selectImages = db.prepare(
    "SELECT position, path, media_type, width, height, byte_size FROM generation_images WHERE generation_id = ? ORDER BY position",
  );
  const summaryCols = `g.id, g.provider, g.model, g.prompt, g.created_at, g.cost_micros, g.cost_status, g.images_requested, g.duration_ms,
    (SELECT count(*) FROM generation_images i WHERE i.generation_id = g.id) AS images_received,
    (SELECT count(*) FROM generation_inputs n WHERE n.generation_id = g.id) AS inputs_count`;
  const selectPage = db.prepare(`SELECT ${summaryCols} FROM generations g ORDER BY g.id DESC LIMIT ?`);
  const selectPageAfter = db.prepare(
    `SELECT ${summaryCols} FROM generations g WHERE g.id < ? ORDER BY g.id DESC LIMIT ?`,
  );
  const selectFirstImage = db.prepare(
    "SELECT position, path, media_type, width, height, byte_size FROM generation_images WHERE generation_id = ? ORDER BY position LIMIT 1",
  );
  const insertInput = db.prepare(
    `INSERT INTO generation_inputs (generation_id, position, path, media_type, width, height, byte_size, original_name)
     VALUES (@generationId, @position, @path, @mediaType, @width, @height, @byteSize, @originalName)`,
  );
  const selectInputs = db.prepare(
    "SELECT position, path, media_type, width, height, byte_size, original_name FROM generation_inputs WHERE generation_id = ? ORDER BY position",
  );
  const selectRecorded = db.prepare(
    "SELECT media_type FROM generation_images WHERE path = ? UNION ALL SELECT media_type FROM generation_inputs WHERE path = ?",
  );
  const selectCostHistory = db.prepare(
    `SELECT g.cost_micros, (SELECT count(*) FROM generation_images i WHERE i.generation_id = g.id) AS images
     FROM generations g
     WHERE g.provider = ? AND g.model = ? AND g.cost_status = 'known' AND g.cost_micros IS NOT NULL
     ORDER BY g.id DESC LIMIT ?`,
  );
  const selectIds = db.prepare("SELECT id FROM generations ORDER BY id").pluck();
  const selectPending = db.prepare(
    "SELECT id, provider, cost_ref, created_at, duration_ms FROM generations WHERE cost_status = 'pending' ORDER BY id",
  );
  const PendingRow = z.object({
    id: z.string(),
    provider: z.string(),
    cost_ref: z.string().nullable(),
    created_at: z.string(),
    duration_ms: z.number().int(),
  });
  const updateCost = db.prepare(
    "UPDATE generations SET cost_status = @status, cost_micros = @micros WHERE id = @id AND cost_status = 'pending'",
  );

  const genExists = db.prepare("SELECT 1 FROM generations WHERE id = ?").pluck();
  const selectStoredOutput = db.prepare(
    "SELECT path, media_type FROM generation_images WHERE generation_id = ? AND position = ?",
  );
  const selectStoredInput = db.prepare(
    "SELECT path, media_type, original_name FROM generation_inputs WHERE generation_id = ? AND position = ?",
  );
  const StoredRow = z.object({ path: z.string(), media_type: z.string(), original_name: z.string().nullish() });
  const selectDerived = db.prepare(
    "SELECT id, source_relation, source_output, created_at, prompt FROM generations WHERE source_id = ? ORDER BY id DESC LIMIT ?",
  );
  const countDerived = db.prepare("SELECT count(*) FROM generations WHERE source_id = ?").pluck();
  const DerivedRow = z
    .object({
      id: z.string(),
      source_relation: z.enum(["rerun", "reuse"]),
      source_output: z.number().int().nullable(),
      created_at: z.string(),
      prompt: z.string(),
    })
    .transform((r) => ({
      id: r.id,
      relation: r.source_relation,
      output: r.source_output,
      createdAt: r.created_at,
      prompt: r.prompt,
    }));
  const selectPrompt = db.prepare("SELECT prompt FROM generations WHERE id = ?").pluck();
  const selectComment = db.prepare("SELECT body, updated_at FROM generation_comments WHERE generation_id = ?");
  const upsertComment = db.prepare(
    `INSERT INTO generation_comments (generation_id, body, updated_at) VALUES (@id, @body, @updatedAt)
     ON CONFLICT (generation_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
  );
  const deleteComment = db.prepare("DELETE FROM generation_comments WHERE generation_id = ?");
  const selectTags = db.prepare("SELECT tag FROM generation_tags WHERE generation_id = ? ORDER BY position").pluck();
  const tagExists = db.prepare("SELECT 1 FROM generation_tags WHERE generation_id = ? AND tag = ?").pluck();
  const countTags = db.prepare("SELECT count(*) FROM generation_tags WHERE generation_id = ?").pluck();
  const insertTag = db.prepare(
    `INSERT INTO generation_tags (generation_id, tag, position)
     VALUES (@id, @tag, (SELECT coalesce(max(position), 0) + 1 FROM generation_tags WHERE generation_id = @id))`,
  );
  const deleteTag = db.prepare("DELETE FROM generation_tags WHERE generation_id = ? AND tag = ?");
  const deleteGen = db.prepare("DELETE FROM generations WHERE id = ?");

  /** Tags for many generations in one query, each list in insertion order. */
  function tagsOf(ids: string[]): Map<string, string[]> {
    const out = new Map<string, string[]>(ids.map((id) => [id, []]));
    if (!ids.length) return out;
    const rows = db
      .prepare(
        `SELECT generation_id, tag FROM generation_tags WHERE generation_id IN (${ids.map(() => "?").join(",")})
         ORDER BY generation_id, position`,
      )
      .all(...ids);
    for (const raw of rows) {
      const row = TagRow.parse(raw);
      out.get(row.generation_id)?.push(row.tag);
    }
    return out;
  }

  function commented(ids: string[]): Set<string> {
    if (!ids.length) return new Set();
    const rows = db
      .prepare(`SELECT generation_id FROM generation_comments WHERE generation_id IN (${ids.map(() => "?").join(",")})`)
      .pluck()
      .all(...ids) as string[];
    return new Set(rows);
  }

  const addTagTx = db.transaction((id: string, tag: string) => {
    if (!genExists.get(id)) return { status: "missing" as const };
    if (tagExists.get(id, tag)) return { status: "duplicate" as const, tags: selectTags.all(id) as string[] };
    if ((countTags.get(id) as number) >= MAX_TAGS)
      return { status: "limit" as const, tags: selectTags.all(id) as string[] };
    insertTag.run({ id, tag });
    return { status: "added" as const, tags: selectTags.all(id) as string[] };
  });

  const deleteTx = db.transaction((id: string, moveFiles: () => void) => {
    if (deleteGen.run(id).changes === 0) return false; // children cascade (images, inputs, comment, tags)
    moveFiles(); // last step: if it throws, the deletion rolls back (ADR-0014)
    return true;
  });

  const insertAll = db.transaction(
    (gen: NewGeneration, images: ImageRecord[], inputs: InputRecord[], commitFiles: () => void) => {
      insertGen.run({
        ...gen,
        costRef: gen.costRef ?? null,
        sourceId: gen.sourceId ?? null,
        sourceRelation: gen.sourceId ? (gen.sourceRelation ?? null) : null,
        sourceOutput: gen.sourceId ? (gen.sourceOutput ?? null) : null,
        requestedParams: JSON.stringify(gen.requestedParams),
        acceptedParams: gen.acceptedParams === null ? null : JSON.stringify(gen.acceptedParams),
        rawRequest: JSON.stringify(gen.rawRequest),
        rawResponse: JSON.stringify(gen.rawResponse),
      });
      for (const image of images) insertImage.run({ generationId: gen.id, ...image });
      for (const input of inputs) insertInput.run({ generationId: gen.id, ...input });
      commitFiles(); // last step: if it throws, the transaction rolls back (ADR-0006)
    },
  );

  return {
    /** Inserts a generation, its outputs and input copies in one transaction whose last step moves the files into place. */
    insertAtomic(gen: NewGeneration, images: ImageRecord[], commitFiles: () => void, inputs: InputRecord[] = []): void {
      insertAll(gen, images, inputs, commitFiles);
    },

    get(id: string): GenerationRecord | undefined {
      const row = selectGen.get(id);
      if (!row) return undefined;
      return {
        ...GenerationRow.parse(row),
        images: selectImages.all(id).map((r) => ImageRow.parse(r)),
        inputs: selectInputs.all(id).map((r) => InputRow.parse(r)),
        comment: CommentRow.nullable().parse(selectComment.get(id) ?? null),
        tags: selectTags.all(id) as string[],
      };
    },

    /**
     * Known costs of the last `limit` generations with this provider + model, as an average per received image
     * (ADR-0021). Pending / unavailable costs and other models never count (spec AC-06).
     */
    costHistory(provider: string, model: string, limit = 20): { count: number; perImageMicros: number | null } {
      const rows = selectCostHistory.all(provider, model, limit) as { cost_micros: number; images: number }[];
      const images = rows.reduce((n, r) => n + r.images, 0);
      const micros = rows.reduce((n, r) => n + r.cost_micros, 0);
      return { count: rows.length, perImageMicros: images > 0 ? Math.round(micros / images) : null };
    },

    /** Newest first; `cursor` is the last id of the previous page. */
    listPage({ cursor, limit }: { cursor?: string; limit: number }) {
      const rows = cursor ? selectPageAfter.all(cursor, limit + 1) : selectPage.all(limit + 1);
      const summaries = rows.slice(0, limit).map((r) => SummaryRow.parse(r));
      const ids = summaries.map((s) => s.id);
      const tags = tagsOf(ids);
      const withComment = commented(ids);
      const page = summaries.map((summary) => ({
        ...summary,
        thumbnail: ImageRow.parse(selectFirstImage.get(summary.id)),
        tags: tags.get(summary.id) ?? [],
        hasComment: withComment.has(summary.id),
      }));
      const nextCursor = rows.length > limit ? (page.at(-1)?.id ?? null) : null;
      return { items: page satisfies GenerationSummaryRecord[], nextCursor };
    },

    /** The stored image at this exact relative path, if one is recorded. */
    recordedImage(path: string): { mediaType: string } | undefined {
      const row = selectRecorded.get(path, path) as { media_type: string } | undefined;
      return row ? { mediaType: row.media_type } : undefined;
    },

    /** Replaces the comment (`null` removes it). */
    setComment(
      id: string,
      body: string | null,
      updatedAt: string,
    ): { status: "ok"; comment: CommentRecord | null } | { status: "missing" } {
      if (!genExists.get(id)) return { status: "missing" };
      if (body === null) {
        deleteComment.run(id);
        return { status: "ok", comment: null };
      }
      upsertComment.run({ id, body, updatedAt });
      return { status: "ok", comment: { body, updatedAt } };
    },

    /** Adds one normalized tag: dedup by key, at most `MAX_TAGS`, all inside one transaction (ADR-0015). */
    addTag(id: string, tag: string) {
      return addTagTx(id, tag);
    },

    removeTag(id: string, tag: string): { status: "ok"; tags: string[] } | { status: "missing" } {
      if (!genExists.get(id)) return { status: "missing" };
      deleteTag.run(id, tag);
      return { status: "ok", tags: selectTags.all(id) as string[] };
    },

    /** Deletes a generation and its children; `moveFiles` runs as the transaction's last step. `false` = no such id. */
    deleteAtomic(id: string, moveFiles: () => void): boolean {
      return deleteTx(id, moveFiles);
    },

    exists(id: string): boolean {
      return Boolean(genExists.get(id));
    },

    /** The prompt of a generation, or `null` when it no longer exists (lineage text). */
    promptOf(id: string): string | null {
      return (selectPrompt.get(id) as string | undefined) ?? null;
    },

    /** A recorded output/input image of a generation, or `undefined` — the only way a request reaches stored files. */
    storedImage(generationId: string, kind: "input" | "output", position: number): StoredImage | undefined {
      const raw = (kind === "output" ? selectStoredOutput : selectStoredInput).get(generationId, position);
      if (!raw) return undefined;
      const row = StoredRow.parse(raw);
      return { path: row.path, mediaType: row.media_type, name: row.original_name ?? row.path.split("/").at(-1) ?? "" };
    },

    /** Generations derived from `id`, newest first, at most `limit`, with the total (one level — ADR-0018). */
    derivedOf(id: string, limit = 50): { items: DerivedRecord[]; total: number } {
      return {
        items: selectDerived.all(id, limit).map((r) => DerivedRow.parse(r)),
        total: countDerived.get(id) as number,
      };
    },

    allIds(): string[] {
      return selectIds.all() as string[];
    },

    listPendingCosts(): PendingCost[] {
      return selectPending.all().map((raw) => {
        const r = PendingRow.parse(raw);
        return {
          id: r.id,
          provider: r.provider,
          costRef: r.cost_ref,
          answeredAt: Date.parse(r.created_at) + r.duration_ms,
        };
      });
    },

    /** Final price for a pending generation: micro-USD → `known`, `null` → `unavailable`. No-op unless still pending. */
    resolveCost(id: string, micros: number | null): boolean {
      const status = micros === null ? "unavailable" : "known";
      return updateCost.run({ id, status, micros }).changes === 1;
    },
  };
}

export type GenerationsRepo = ReturnType<typeof createGenerationsRepo>;
