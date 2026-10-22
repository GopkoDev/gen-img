import type { Hono } from "hono";
import { PreferencesQuery, type PreferencesResponse, SetPreferenceRequest } from "../../../shared/models";
import { AppError } from "../../lib/errors";
import type { ModelCatalog } from "../providers/catalog";
import { ProviderError } from "../providers/port";
import type { ProviderRegistry } from "../providers/registry";
import { providerAppError } from "../providers/routes";
import type { ModelsRepo } from "./repo";

export type ModelsRouteDeps = { repo: ModelsRepo; providers: ProviderRegistry; catalog: ModelCatalog };

const fieldsOf = (issues: { path: PropertyKey[]; message: string }[]) =>
  Object.fromEntries(issues.map((i) => [i.path.join(".") || "body", i.message]));

export function registerModelsRoutes(app: Hono, deps: ModelsRouteDeps) {
  app.get("/model-preferences", (c) => {
    const q = PreferencesQuery.safeParse(c.req.query());
    if (!q.success)
      throw new AppError("VALIDATION_ERROR", "Invalid preferences query", 400, { fields: fieldsOf(q.error.issues) });
    return c.json({ preferences: deps.repo.list(q.data.provider) } satisfies PreferencesResponse);
  });

  app.patch("/model-preferences", async (c) => {
    const raw: unknown = await c.req.json().catch(() => {
      throw new AppError("VALIDATION_ERROR", "Request body must be JSON", 400);
    });
    const body = SetPreferenceRequest.safeParse(raw);
    if (!body.success)
      throw new AppError("VALIDATION_ERROR", "Invalid preference", 400, { fields: fieldsOf(body.error.issues) });
    const { provider: providerId, model, favorite, hidden } = body.data;

    const provider = deps.providers.get(providerId);
    if (!provider) throw new AppError("NOT_FOUND", `Unknown provider: ${providerId}`, 404);
    if (!provider.configured)
      throw new AppError("PROVIDER_NOT_CONFIGURED", `${provider.name} is not configured`, 409, {
        provider: provider.id,
      });
    const found = await deps.catalog.find(provider.id, model);
    if (found === null)
      throw providerAppError(new ProviderError(provider.id, null, `Couldn't load the ${provider.name} model list`));
    if (!found) throw new AppError("NOT_FOUND", `Unknown model: ${model}`, 404);

    return c.json(deps.repo.set(provider.id, model, { favorite, hidden }));
  });
}
