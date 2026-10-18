import { z } from "zod";
import { CommentResponse, TagsResponse } from "../../shared/curation";
import { ErrorResponse } from "../../shared/errors";
import {
  CurrentJobResponse,
  Generation,
  GenerationPage,
  JobResponse,
  type StartGenerationRequest,
} from "../../shared/generations";
import { HealthResponse } from "../../shared/health";
import { CostHistory, PriceResponse } from "../../shared/pricing";
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
  price: (providerId: string, model: string) =>
    request(PriceResponse, `/providers/${encodeURIComponent(providerId)}/price?model=${encodeURIComponent(model)}`),
  costHistory: (provider: string, model: string) =>
    request(
      CostHistory,
      `/generations/cost-history?provider=${encodeURIComponent(provider)}&model=${encodeURIComponent(model)}`,
    ),
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
  generations: (cursor?: string, limit?: number) => {
    const q = new URLSearchParams();
    if (cursor) q.set("cursor", cursor);
    if (limit !== undefined) q.set("limit", String(limit));
    const qs = q.toString();
    return request(GenerationPage, `/generations${qs ? `?${qs}` : ""}`);
  },
  setComment: (id: string, body: string) =>
    request(CommentResponse, `/generations/${encodeURIComponent(id)}/comment`, json("PUT", { body })),
  addTag: (id: string, tag: string) =>
    request(TagsResponse, `/generations/${encodeURIComponent(id)}/tags`, json("POST", { tag })),
  removeTag: (id: string, tag: string) =>
    request(TagsResponse, `/generations/${encodeURIComponent(id)}/tags/${encodeURIComponent(tag)}`, json("DELETE")),
  deleteGeneration: (id: string) => request(z.null(), `/generations/${encodeURIComponent(id)}`, json("DELETE")),
  generation: (id: string) => request(Generation, `/generations/${encodeURIComponent(id)}`),
};
