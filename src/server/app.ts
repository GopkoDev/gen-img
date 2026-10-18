import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import type { Db } from "./db/client";
import { type Config, DEV_UI_PORT } from "./lib/config";
import { notFound, onError } from "./lib/errors";
import { requestGuard } from "./lib/request-guard";
import { createModelCatalog } from "./modules/providers/catalog";
import { createProviderRegistry } from "./modules/providers/registry";
import { registerProvidersRoutes } from "./modules/providers/routes";
import { registerSystemRoutes } from "./modules/system/routes";

/** Everything a module needs is passed in explicitly — no global singletons, so tests build an app with fakes. */
export type AppDeps = {
  config: Config;
  db: Db;
  /** Outbound HTTP for provider adapters — tests pass a fixture-backed fake. */
  fetch?: typeof fetch;
  /** Clock (epoch ms) for caches. */
  now?: () => number;
};

export type CreateAppOptions = {
  /** Directory of the built SPA (`dist/web`); when set, served at `/` with an index.html fallback. */
  webDir?: string;
};

export function createApp(deps: AppDeps, options: CreateAppOptions = {}) {
  const api = new Hono();
  api.use("*", requestGuard([deps.config.port, DEV_UI_PORT]));
  registerSystemRoutes(api, deps);

  const providers = createProviderRegistry(deps.config, deps.fetch);
  const catalog = createModelCatalog(providers, deps.now);
  registerProvidersRoutes(api, { providers, catalog });

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
