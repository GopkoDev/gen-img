import { z } from "zod";
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
  }));

type StoredGeneration = z.infer<typeof GenerationRow>;
/** A generation to insert; `costRef` is only set when the price will be looked up later (ADR-0013). */
export type NewGeneration = Omit<StoredGeneration, "costRef"> & { costRef?: string | null };
export type GenerationRecord = StoredGeneration & { images: ImageRecord[]; inputs: InputRecord[] };

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
  }));
export type GenerationSummaryRecord = z.infer<typeof SummaryRow> & { thumbnail: ImageRecord };

export function createGenerationsRepo(db: Db) {
  const insertGen = db.prepare(
    `INSERT INTO generations (id, provider, model, prompt, requested_params, accepted_params, images_requested,
       cost_micros, cost_status, cost_ref, created_at, duration_ms, raw_request, raw_response)
     VALUES (@id, @provider, @model, @prompt, @requestedParams, @acceptedParams, @imagesRequested,
       @costMicros, @costStatus, @costRef, @createdAt, @durationMs, @rawRequest, @rawResponse)`,
  );
  const insertImage = db.prepare(
    `INSERT INTO generation_images (generation_id, position, path, media_type, width, height, byte_size)
     VALUES (@generationId, @position, @path, @mediaType, @width, @height, @byteSize)`,
  );
  const selectGen = db.prepare("SELECT * FROM generations WHERE id = ?");
  const selectImages = db.prepare(
    "SELECT position, path, media_type, width, height, byte_size FROM generation_images WHERE generation_id = ? ORDER BY position",
  );
  const summaryCols = `g.id, g.provider, g.model, g.prompt, g.created_at, g.cost_micros, g.cost_status, g.images_requested,
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

  const insertAll = db.transaction(
    (gen: NewGeneration, images: ImageRecord[], inputs: InputRecord[], commitFiles: () => void) => {
      insertGen.run({
        ...gen,
        costRef: gen.costRef ?? null,
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
      };
    },

    /** Newest first; `cursor` is the last id of the previous page. */
    listPage({ cursor, limit }: { cursor?: string; limit: number }) {
      const rows = cursor ? selectPageAfter.all(cursor, limit + 1) : selectPage.all(limit + 1);
      const page = rows.slice(0, limit).map((r) => {
        const summary = SummaryRow.parse(r);
        return { ...summary, thumbnail: ImageRow.parse(selectFirstImage.get(summary.id)) };
      });
      const nextCursor = rows.length > limit ? (page.at(-1)?.id ?? null) : null;
      return { items: page satisfies GenerationSummaryRecord[], nextCursor };
    },

    /** The stored image at this exact relative path, if one is recorded. */
    recordedImage(path: string): { mediaType: string } | undefined {
      const row = selectRecorded.get(path, path) as { media_type: string } | undefined;
      return row ? { mediaType: row.media_type } : undefined;
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
