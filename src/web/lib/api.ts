import { z } from "zod";
import { ErrorResponse } from "../../shared/errors";
import {
  CurrentJobResponse,
  Generation,
  GenerationPage,
  JobResponse,
  type StartGenerationRequest,
} from "../../shared/generations";
import { HealthResponse } from "../../shared/health";
import { ModelsResponse, ProvidersResponse } from "../../shared/providers";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<S extends z.ZodType>(schema: S, path: string, init?: RequestInit): Promise<z.infer<S>> {
  const res = await fetch(`/api${path}`, init);
  const body: unknown = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const parsed = ErrorResponse.safeParse(body);
    if (parsed.success) {
      const { code, message, details } = parsed.data.error;
      throw new ApiError(res.status, code, message, details);
    }
    throw new ApiError(res.status, "HTTP_ERROR", `Request failed: ${res.status}`);
  }
  return schema.parse(body);
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { "content-type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  health: () => request(HealthResponse, "/health"),
  providers: () => request(ProvidersResponse, "/providers"),
  models: (providerId: string) => request(ModelsResponse, `/providers/${encodeURIComponent(providerId)}/models`),
  /** JSON for text-only; multipart (`request` JSON part + `inputs` files, in order) when images are attached (ADR-0010). */
  startGeneration: (body: StartGenerationRequest, files: File[] = []) => {
    if (files.length === 0) return request(JobResponse, "/generations", json("POST", body));
    const form = new FormData();
    form.append("request", JSON.stringify(body));
    for (const f of files) form.append("inputs", f, f.name);
    return request(JobResponse, "/generations", { method: "POST", body: form });
  },
  currentJob: () => request(CurrentJobResponse, "/generation-job"),
  dismissJob: () => request(z.null(), "/generation-job", json("DELETE")),
  generations: (cursor?: string) =>
    request(GenerationPage, `/generations${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  generation: (id: string) => request(Generation, `/generations/${encodeURIComponent(id)}`),
};
