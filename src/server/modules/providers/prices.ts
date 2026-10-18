import type { PriceResponse } from "../../../shared/pricing";
import { AppError } from "../../lib/errors";
import type { ModelCatalog } from "./catalog";
import { ProviderError } from "./port";
import type { ProviderRegistry } from "./registry";

export const PRICE_TTL_MS = 10 * 60 * 1000; // same as the model list (spec §6)
export const PRICE_TIMEOUT_MS = 10_000;

/**
 * Published prices per (provider, model), cached 10 minutes (ADR-0020, SAD §8). Only models the provider's
 * catalog offers are looked up; failures are not cached, so the next selection tries again.
 */
export function createPriceCatalog(
  providers: ProviderRegistry,
  catalog: ModelCatalog,
  now: () => number = Date.now,
  timeoutMs: number = PRICE_TIMEOUT_MS,
) {
  const cache = new Map<string, { value: PriceResponse; at: number }>();

  return {
    async price(providerId: string, modelId: string): Promise<PriceResponse> {
      const provider = providers.get(providerId);
      if (!provider) throw new AppError("NOT_FOUND", `Unknown provider: ${providerId}`, 404);
      const key = `${providerId}\u0000${modelId}`;
      const hit = cache.get(key);
      if (hit && now() - hit.at < PRICE_TTL_MS) return hit.value;
      // Only ids the catalog confirms reach a provider URL (spec §6.1, AC-10) — also when the catalog is down.
      const known = await catalog.find(providerId, modelId);
      if (known === undefined) throw new AppError("NOT_FOUND", "This model is not offered by the provider", 404);
      if (known === null) throw new ProviderError(provider.id, null, "The model list couldn't be loaded");
      const at = now();
      const price = provider.priceOf
        ? await provider.priceOf(modelId, AbortSignal.timeout(timeoutMs))
        : { kind: "unknown" as const };
      const value: PriceResponse = { price, fetchedAt: new Date(at).toISOString() };
      cache.set(key, { value, at });
      return value;
    },
  };
}

export type PriceCatalog = ReturnType<typeof createPriceCatalog>;
