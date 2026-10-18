import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "PROVIDER_ERROR"
  | "INTERNAL_ERROR"
  | "GENERATION_IN_PROGRESS"
  | "PROVIDER_NOT_CONFIGURED"
  | "STORAGE_ERROR"
  | "FORBIDDEN";

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: ContentfulStatusCode = 500,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** The one error envelope every /api response uses: `{ error: { code, message, details? } }`. */
export function renderError(c: Context, err: AppError) {
  const body = {
    error: {
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    },
  };
  return c.json(body, err.status);
}

export function onError(err: Error, c: Context) {
  if (err instanceof AppError) return renderError(c, err);
  console.error(err);
  return renderError(c, new AppError("INTERNAL_ERROR", "Internal server error", 500));
}

export function notFound(c: Context) {
  return renderError(c, new AppError("NOT_FOUND", `Route not found: ${c.req.method} ${c.req.path}`, 404));
}
