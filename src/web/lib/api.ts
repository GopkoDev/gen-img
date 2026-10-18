import type { z } from "zod";
import { ErrorResponse } from "../../shared/errors";
import { HealthResponse } from "../../shared/health";

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
  const body: unknown = await res.json().catch(() => null);
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

export const api = {
  health: () => request(HealthResponse, "/health"),
};
