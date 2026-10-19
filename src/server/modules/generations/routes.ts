import { readFile } from "node:fs/promises";
import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { CommentResponse, TagsResponse } from "../../../shared/curation";
import type {
  CurrentJobResponse,
  Generation,
  GenerationPage,
  GenerationSummary,
  InputImage,
  JobResponse,
  ModelGroupsResponse,
  OutputImage,
  PromptGroup,
  PromptGroupPage,
} from "../../../shared/generations";
import { MAX_INPUT_BYTES, MAX_INPUT_IMAGES, PromptKey } from "../../../shared/generations";
import type { CostHistory } from "../../../shared/pricing";
import { ProviderId } from "../../../shared/providers";
import { AppError } from "../../lib/errors";
import type { FileStore } from "../storage/file-store";
import type { ImageRecord, InputRecord, GenerationSummaryRecord as SummaryRecord } from "./repo";
import type { GenerationsService, InputFile } from "./service";

export type GenerationsRouteDeps = { service: GenerationsService; files: FileStore };

const CostHistoryQuery = z.object({
  provider: ProviderId,
  model: z.string().min(1, { error: "Choose a model" }).max(200),
});

const LimitField = z.coerce
  .number({ error: "Limit must be a whole number between 1 and 100" })
  .int({ error: "Limit must be a whole number between 1 and 100" })
  .min(1, { error: "Limit must be a whole number between 1 and 100" })
  .max(100, { error: "Limit must be a whole number between 1 and 100" })
  .default(24);

const FILTER_MSG = "Provider and model go together — send both or neither";
const filterField = z.string().min(1, { error: FILTER_MSG }).max(200, { error: "At most 200 characters" }).optional();

const ListQuery = z
  .object({
    provider: filterField,
    model: filterField,
    cursor: z
      .string()
      .regex(/^[0-9A-Z]{1,26}$/, { error: "Cursor must be a generation id" })
      .optional(),
    limit: LimitField,
    prompt: PromptKey.optional(),
  })
  .refine((q) => (q.provider === undefined) === (q.model === undefined), { error: FILTER_MSG, path: ["model"] })
  .refine((q) => q.prompt === undefined || (q.provider === undefined && q.model === undefined), {
    error: "A prompt filter cannot be combined with provider and model",
    path: ["prompt"],
  });

const CursorField = z.string().regex(/^[0-9A-Z]{1,26}$/, { error: "Cursor must be a generation id" });
const PromptGroupsQuery = z.object({
  cursor: CursorField.optional(),
  limit: LimitField,
  single: z.enum(["0", "1"], { error: "Single must be 0 or 1" }).default("0"),
});
const PromptKeyParam = z.object({ key: PromptKey });
const invalidQuery = (what: string, error: z.ZodError) =>
  new AppError("VALIDATION_ERROR", `Invalid ${what}`, 400, {
    fields: Object.fromEntries(error.issues.map((i) => [i.path.join("."), i.message])),
  });

const ModelsQuery = z.object({
  latest: z.coerce
    .number({ error: "Latest must be a whole number between 0 and 4" })
    .int({ error: "Latest must be a whole number between 0 and 4" })
    .min(0, { error: "Latest must be a whole number between 0 and 4" })
    .max(4, { error: "Latest must be a whole number between 0 and 4" })
    .default(0),
});

const FILES_PREFIX = "/api/files/";
const MAX_BODY_BYTES = MAX_INPUT_IMAGES * MAX_INPUT_BYTES + 1024 * 1024; // files + the JSON part (SAD §8)

/** A start request is JSON (text-only) or multipart: a `request` JSON part plus `inputs` files (ADR-0010). */
async function readStart(req: {
  header(name: string): string | undefined;
  json(): Promise<unknown>;
  parseBody(o: { all: true }): Promise<Record<string, unknown>>;
}): Promise<{ body: unknown; files: InputFile[] }> {
  const invalid = (message: string) => new AppError("VALIDATION_ERROR", message, 400);
  if (!(req.header("content-type") ?? "").startsWith("multipart/form-data")) {
    const body = await req.json().catch(() => {
      throw invalid("Request body must be JSON");
    });
    return { body, files: [] };
  }
  const form = await req.parseBody({ all: true });
  if (typeof form.request !== "string") throw invalid("The multipart request needs a JSON `request` part");
  let body: unknown;
  try {
    body = JSON.parse(form.request);
  } catch {
    throw invalid("The `request` part must be JSON");
  }
  const parts = form.inputs === undefined ? [] : Array.isArray(form.inputs) ? form.inputs : [form.inputs];
  const files: InputFile[] = [];
  for (const part of parts) {
    if (!(part instanceof File)) throw invalid("`inputs` parts must be files");
    files.push({ bytes: new Uint8Array(await part.arrayBuffer()), name: part.name });
  }
  return { body, files };
}

async function jsonBody(req: { json(): Promise<unknown> }): Promise<unknown> {
  return req.json().catch(() => {
    throw new AppError("VALIDATION_ERROR", "Request body must be JSON", 400);
  });
}

const toInput = (img: InputRecord): InputImage => ({
  position: img.position,
  url: `${FILES_PREFIX}${img.path}`,
  mediaType: img.mediaType,
  width: img.width,
  height: img.height,
  byteSize: img.byteSize,
  originalName: img.originalName,
});

const toImage = (img: ImageRecord): OutputImage => ({
  position: img.position,
  url: `${FILES_PREFIX}${img.path}`,
  mediaType: img.mediaType,
  width: img.width,
  height: img.height,
  byteSize: img.byteSize,
});

const toSummary = (g: SummaryRecord): GenerationSummary => ({
  ...g,
  provider: ProviderId.parse(g.provider),
  thumbnail: toImage(g.thumbnail),
});

const toGroup = (g: ReturnType<GenerationsService["promptGroup"]> & object): PromptGroup => ({
  ...g,
  models: g.models.map((m) => ({ provider: ProviderId.parse(m.provider), model: m.model })),
  cover: { url: `${FILES_PREFIX}${g.cover.path}`, width: g.cover.width, height: g.cover.height },
});

export function registerGenerationsRoutes(app: Hono, deps: GenerationsRouteDeps) {
  const { service } = deps;

  app.post(
    "/generations",
    bodyLimit({
      maxSize: MAX_BODY_BYTES,
      onError: () => {
        throw new AppError("VALIDATION_ERROR", "The request is too large — at most 8 input images of 10 MB each", 400);
      },
    }),
    async (c) => {
      const { body, files } = await readStart(c.req);
      const job = await service.startGenerationChecked(body, files);
      return c.json({ job } satisfies JobResponse, 202);
    },
  );

  app.get("/generations", (c) => {
    const q = ListQuery.safeParse(c.req.query());
    if (!q.success)
      throw new AppError("VALIDATION_ERROR", "Invalid gallery query", 400, {
        fields: Object.fromEntries(q.error.issues.map((i) => [i.path.join("."), i.message])),
      });
    const { prompt, ...rest } = q.data;
    const page = service.list({ ...rest, promptKey: prompt });
    return c.json({
      items: page.items.map(toSummary),
      nextCursor: page.nextCursor,
    } satisfies GenerationPage);
  });

  // Before `/generations/:id`, so «prompts» is never read as an id.
  app.get("/generations/prompts", (c) => {
    const q = PromptGroupsQuery.safeParse(c.req.query());
    if (!q.success) throw invalidQuery("prompts query", q.error);
    const page = service.promptGroups({ cursor: q.data.cursor, limit: q.data.limit, single: q.data.single === "1" });
    return c.json({
      groups: page.groups.map(toGroup),
      nextCursor: page.nextCursor,
    } satisfies PromptGroupPage);
  });

  app.get("/generations/prompts/:key", (c) => {
    const p = PromptKeyParam.safeParse({ key: c.req.param("key") });
    if (!p.success) throw invalidQuery("prompt key", p.error);
    const g = service.promptGroup(p.data.key);
    if (!g) throw new AppError("NOT_FOUND", "No generation uses this prompt", 404);
    return c.json(toGroup(g) satisfies PromptGroup);
  });

  // Before `/generations/:id`, so «models» is never read as an id.
  app.get("/generations/models", (c) => {
    const q = ModelsQuery.safeParse(c.req.query());
    if (!q.success)
      throw new AppError("VALIDATION_ERROR", "Invalid models query", 400, {
        fields: Object.fromEntries(q.error.issues.map((i) => [i.path.join("."), i.message])),
      });
    return c.json({
      models: service.models(q.data.latest).map((g) => ({
        provider: ProviderId.parse(g.provider),
        model: g.model,
        count: g.count,
        latestId: g.latestId,
        items: g.items.map(toSummary),
      })),
    } satisfies ModelGroupsResponse);
  });

  const lineageSource = (id: string, relation: "rerun" | "reuse", output: number | null) => {
    const prompt = service.promptOf(id);
    return { id, relation, output, exists: prompt !== null, prompt };
  };

  // Before `/generations/:id`, so «cost-history» is never read as an id.
  app.get("/generations/cost-history", (c) => {
    const q = CostHistoryQuery.safeParse(c.req.query());
    if (!q.success)
      throw new AppError("VALIDATION_ERROR", "Invalid cost history query", 400, {
        fields: Object.fromEntries(q.error.issues.map((i) => [i.path.join("."), i.message])),
      });
    return c.json(service.costHistory(q.data.provider, q.data.model) satisfies CostHistory);
  });

  app.get("/generations/:id", (c) => {
    const g = service.get(c.req.param("id"));
    if (!g) throw new AppError("NOT_FOUND", "Generation not found", 404);
    const { sourceId, sourceRelation, sourceOutput, costRef: _ref, ...rest } = g;
    return c.json({
      ...rest,
      provider: ProviderId.parse(g.provider),
      images: g.images.map(toImage),
      inputs: g.inputs.map(toInput),
      source: sourceId && sourceRelation ? lineageSource(sourceId, sourceRelation, sourceOutput) : null,
      derived: service.derivedOf(g.id),
    } satisfies Generation);
  });

  app.put("/generations/:id/comment", async (c) => {
    const body = await jsonBody(c.req);
    return c.json(service.setComment(c.req.param("id"), body) satisfies CommentResponse);
  });

  app.post("/generations/:id/tags", async (c) => {
    const body = await jsonBody(c.req);
    return c.json(service.addTag(c.req.param("id"), body) satisfies TagsResponse);
  });

  app.delete("/generations/:id/tags/:tag", (c) =>
    c.json(service.removeTag(c.req.param("id"), c.req.param("tag")) satisfies TagsResponse),
  );

  app.delete("/generations/:id", (c) => {
    service.deleteGeneration(c.req.param("id"));
    return c.body(null, 204);
  });

  app.get("/generation-job", (c) => c.json({ job: service.getJob() } satisfies CurrentJobResponse));

  app.delete("/generation-job", (c) => {
    service.dismissJob();
    return c.body(null, 204);
  });

  // Only paths recorded for a stored generation image are served; the lookup is by exact DB value (ADR-0006).
  app.get("/files/*", async (c) => {
    const notFound = () => new AppError("NOT_FOUND", "File not found", 404);
    let relPath: string;
    try {
      relPath = decodeURIComponent(c.req.path.slice(FILES_PREFIX.length));
    } catch {
      throw notFound();
    }
    const recorded = service.recordedImage(relPath);
    if (!recorded) throw notFound();
    const bytes = await readFile(deps.files.resolveRecorded(relPath)).catch(() => {
      throw notFound();
    });
    return c.body(bytes, 200, {
      "content-type": recorded.mediaType,
      "cache-control": "private, max-age=31536000, immutable",
    });
  });
}
