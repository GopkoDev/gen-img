import type { ImageModel } from "../../../shared/providers";
import { ProviderError } from "./port";
import type { ProviderRegistry } from "./registry";

export const CATALOG_TTL_MS = 10 * 60 * 1000;

/** Per-provider image-model list, cached in memory for 10 minutes (SAD §8). */
export function createModelCatalog(providers: ProviderRegistry, now: () => number = Date.now) {
  const cache = new Map<string, { models: ImageModel[]; fetchedAt: number }>();

  async function models(providerId: string): Promise<{ models: ImageModel[]; fetchedAt: number }> {
    const hit = cache.get(providerId);
    if (hit && now() - hit.fetchedAt < CATALOG_TTL_MS) return hit;
    const provider = providers.get(providerId);
    if (!provider) throw new ProviderError("openrouter", null, `Unknown provider: ${providerId}`);
    const fresh = { models: await provider.listModels(), fetchedAt: now() };
    cache.set(providerId, fresh);
    return fresh;
  }

  return {
    models,
    /** The model, or `undefined` when unknown; `null` when the catalog can't be loaded right now. */
    async find(providerId: string, modelId: string): Promise<ImageModel | undefined | null> {
      try {
        return (await models(providerId)).models.find((m) => m.id === modelId);
      } catch {
        return null;
      }
    },
  };
}

export type ModelCatalog = ReturnType<typeof createModelCatalog>;
