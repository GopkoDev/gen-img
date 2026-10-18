import { readFile } from "node:fs/promises";
import type { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { CommentResponse, TagsResponse } from "../../../shared/curation";
import type {
  CurrentJobResponse,
  Generation,
  GenerationPage,
  InputImage,
  JobResponse,
  OutputImage,
} from "../../../shared/generations";
import { MAX_INPUT_BYTES, MAX_INPUT_IMAGES } from "../../../shared/generations";
import { ProviderId } from "../../../shared/providers";
import { AppError } from "../../lib/errors";
import type { FileStore } from "../storage/file-store";
import type { ImageRecord, InputRecord } from "./repo";
import type { GenerationsService, InputFile } from "./service";

export type GenerationsRouteDeps = { service: GenerationsService; files: FileStore };

const ListQuery = z.object({
  cursor: z
    .string()
    .regex(/^[0-9A-Z]{1,26}$/, { error: "Cursor must be a generation id" })
    .optional(),
  limit: z.coerce
    .number({ error: "Limit must be a whole number between 1 and 100" })
    .int({ error: "Limit must be a whole number between 1 and 100" })
    .min(1, { error: "Limit must be a whole number between 1 and 100" })
    .max(100, { error: "Limit must be a whole number between 1 and 100" })
    .default(24),
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
    const page = service.list(q.data);
    return c.json({
      items: page.items.map((g) => ({ ...g, provider: ProviderId.parse(g.provider), thumbnail: toImage(g.thumbnail) })),
      nextCursor: page.nextCursor,
    } satisfies GenerationPage);
  });

  app.get("/generations/:id", (c) => {
    const g = service.get(c.req.param("id"));
    if (!g) throw new AppError("NOT_FOUND", "Generation not found", 404);
    return c.json({
      ...g,
      provider: ProviderId.parse(g.provider),
      images: g.images.map(toImage),
      inputs: g.inputs.map(toInput),
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
