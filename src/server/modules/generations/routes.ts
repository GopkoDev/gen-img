import { readFile } from "node:fs/promises";
import type { Hono } from "hono";
import { z } from "zod";
import type {
  CurrentJobResponse,
  Generation,
  GenerationPage,
  JobResponse,
  OutputImage,
} from "../../../shared/generations";
import { ProviderId } from "../../../shared/providers";
import { AppError } from "../../lib/errors";
import type { FileStore } from "../storage/file-store";
import type { ImageRecord } from "./repo";
import type { GenerationsService } from "./service";

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

  app.post("/generations", async (c) => {
    const body: unknown = await c.req.json().catch(() => {
      throw new AppError("VALIDATION_ERROR", "Request body must be JSON", 400);
    });
    const job = await service.startGenerationChecked(body);
    return c.json({ job } satisfies JobResponse, 202);
  });

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
    return c.json({ ...g, provider: ProviderId.parse(g.provider), images: g.images.map(toImage) } satisfies Generation);
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
