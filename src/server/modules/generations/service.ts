import type { ImageModel } from "../../../shared/providers";
import { AppError } from "../../lib/errors";
import { newId } from "../../lib/ids";
import type { ModelCatalog } from "../providers/catalog";
import { ProviderError } from "../providers/port";
import type { ProviderRegistry } from "../providers/registry";
import type { FileStore } from "../storage/file-store";
import { checkAgainstModel, type FieldErrors, parseStartRequest, toCost } from "./domain";
import type { JobSlot, JobState } from "./jobs";
import type { GenerationsRepo, ImageRecord } from "./repo";

export type GenerationsServiceDeps = {
  providers: ProviderRegistry;
  catalog: ModelCatalog;
  repo: GenerationsRepo;
  files: FileStore;
  jobs: JobSlot;
  timeoutMs: number;
};

const invalid = (fields: FieldErrors) => new AppError("VALIDATION_ERROR", "Some fields need fixing", 400, { fields });

/** Swaps the adapter's `{ "$image": N }` placeholders for references to the stored files (ADR-0008). */
function linkFiles(value: unknown, paths: string[]): unknown {
  if (Array.isArray(value)) return value.map((v) => linkFiles(v, paths));
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (Object.keys(obj).length === 1 && "$image" in obj) {
      const n = obj.$image;
      return { $file: typeof n === "number" ? (paths[n - 1] ?? null) : null };
    }
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, linkFiles(v, paths)]));
  }
  return value;
}

export function createGenerationsService(deps: GenerationsServiceDeps) {
  let running: Promise<void> = Promise.resolve();

  async function run(job: JobState, input: ReturnType<typeof parseStartRequest> & { ok: true }) {
    const req = input.value;
    const provider = deps.providers.get(req.provider);
    if (!provider) return deps.jobs.fail({ code: "NOT_FOUND", message: `Unknown provider: ${req.provider}` });
    const id = newId(Date.parse(job.startedAt));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new DOMException("timed out", "TimeoutError")), deps.timeoutMs);

    let result: Awaited<ReturnType<typeof provider.generate>>;
    const sentAt = performance.now();
    try {
      result = await provider.generate({ model: req.model, prompt: req.prompt, params: req.params }, ctrl.signal);
    } catch (err) {
      const timedOut = ctrl.signal.aborted;
      const pe = err instanceof ProviderError ? err : new ProviderError(provider.id, null, String(err));
      deps.jobs.fail({
        code: "PROVIDER_ERROR",
        message: timedOut ? `The provider did not answer within ${deps.timeoutMs / 1000} s` : pe.message,
        details: { provider: pe.provider, upstreamStatus: pe.upstreamStatus },
      });
      return;
    } finally {
      clearTimeout(timer);
    }
    const durationMs = Math.round(performance.now() - sentAt);

    try {
      const paths = await deps.files.stage(id, result.images);
      const images: ImageRecord[] = result.images.map((img, i) => ({
        position: i + 1,
        path: paths[i] ?? "",
        mediaType: img.mediaType,
        width: img.width,
        height: img.height,
        byteSize: img.bytes.byteLength,
      }));
      deps.repo.insertAtomic(
        {
          id,
          provider: provider.id,
          model: req.model,
          prompt: req.prompt,
          requestedParams: req.params,
          acceptedParams: result.acceptedParams,
          imagesRequested: req.params.n,
          ...toCost(result.costUsd),
          createdAt: job.startedAt,
          durationMs,
          rawRequest: result.rawRequest,
          rawResponse: linkFiles(result.rawResponse, paths),
        },
        images,
        () => deps.files.commitSync(id),
      );
    } catch (err) {
      deps.files.discard(id);
      deps.jobs.fail({
        code: "STORAGE_ERROR",
        message: `The images could not be stored: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }
    deps.jobs.succeed(id);
  }

  /** Validates and starts a job; `model` (when known) narrows the parameters to what it supports. */
  function startGeneration(body: unknown, model?: ImageModel | null): JobState {
    const parsed = parseStartRequest(body);
    if (!parsed.ok) throw invalid(parsed.fields);
    const provider = deps.providers.get(parsed.value.provider);
    if (!provider) throw new AppError("NOT_FOUND", `Unknown provider: ${parsed.value.provider}`, 404);
    if (!provider.configured)
      throw new AppError("PROVIDER_NOT_CONFIGURED", `${provider.name} is not configured`, 409, {
        provider: provider.id,
      });
    if (model) {
      const fields = checkAgainstModel(parsed.value.params, model);
      if (Object.keys(fields).length) throw invalid(fields);
    }
    const job = deps.jobs.start();
    running = run(job, parsed).catch((err) => {
      try {
        deps.jobs.fail({ code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : String(err) });
      } catch (inner) {
        console.error("generations: job failed and could not be recorded", err, inner); // never crash the server
      }
    });
    return job;
  }

  return {
    startGeneration,

    /** Route entry: looks the model up in the catalog first (unknown model → field error; catalog down → provider decides). */
    async startGenerationChecked(body: unknown): Promise<JobState> {
      const parsed = parseStartRequest(body);
      if (!parsed.ok) throw invalid(parsed.fields);
      const provider = deps.providers.get(parsed.value.provider);
      const model = provider?.configured ? await deps.catalog.find(parsed.value.provider, parsed.value.model) : null;
      if (model === undefined) throw invalid({ model: "This model is not offered by the provider" });
      return startGeneration(body, model);
    },

    getJob: () => deps.jobs.current(),
    dismissJob: () => deps.jobs.dismiss(),
    list: (q: { cursor?: string; limit: number }) => deps.repo.listPage(q),
    get: (id: string) => deps.repo.get(id),
    recordedImage: (path: string) => deps.repo.recordedImage(path),
    sweepOnBoot: () => deps.files.sweep(new Set(deps.repo.allIds())),
    /** Resolves when the in-flight job (if any) has finished — for tests and graceful shutdown. */
    whenIdle: () => running,
  };
}

export type GenerationsService = ReturnType<typeof createGenerationsService>;
