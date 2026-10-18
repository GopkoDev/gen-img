import type { Hono } from "hono";
import type { HealthResponse } from "../../../shared/health";
import type { AppDeps } from "../../app";

export function registerSystemRoutes(app: Hono, _deps: AppDeps) {
  app.get("/health", (c) => c.json({ status: "ok" } satisfies HealthResponse));
}
