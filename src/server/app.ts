import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { Db } from "./db/client";
import type { Config } from "./lib/config";
import { notFound, onError } from "./lib/errors";
import { registerSystemRoutes } from "./modules/system/routes";

/** Everything a module needs is passed in explicitly — no global singletons, so tests build an app with fakes. */
export type AppDeps = {
  config: Config;
  db: Db;
};

export type CreateAppOptions = {
  /** Directory of the built SPA (`dist/web`); when set, served at `/` with an index.html fallback. */
  webDir?: string;
};

export function createApp(deps: AppDeps, options: CreateAppOptions = {}) {
  const api = new Hono();
  registerSystemRoutes(api, deps);

  const app = new Hono();
  app.onError(onError);
  app.notFound(notFound);
  app.route("/api", api);
  // Unmatched /api/* must 404 in the error envelope, never fall through to the SPA.
  app.all("/api/*", notFound);

  if (options.webDir) {
    const root = options.webDir;
    app.use("/*", serveStatic({ root }));
    app.get("*", serveStatic({ root, path: "index.html" }));
  }
  return app;
}
