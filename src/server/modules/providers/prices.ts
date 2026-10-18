import type { PriceResponse } from "../../../shared/pricing";
import { AppError } from "../../lib/errors";
import type { ModelCatalog } from "./catalog";
import { ProviderError } from "./port";
import type { ProviderRegistry } from "./registry";

export const PRICE_TTL_MS = 10 * 60 * 1000; // same as the model list (spec §6)
export const PRICE_TIMEOUT_MS = 10_000;
export const PRICE_FAILURE_TTL_MS = 60 * 1000;
export const PRICE_MAX_CONCURRENT = 4;

/**
 * Published prices per (provider, model), cached 10 minutes (ADR-0020, SAD §8). Only models the provider's
 * catalog offers are looked up. Concurrent lookups of one model share one upstream call, at most 4 upstream
 * calls run at once across providers, and a ProviderError is remembered for 60 s (ADR-0027).
 */
export function createPriceCatalog(
  providers: ProviderRegistry,
  catalog: ModelCatalog,
  now: () => number = Date.now,
  timeoutMs: number = PRICE_TIMEOUT_MS,
) {
  const cache = new Map<string, { value: PriceResponse; at: number }>();
  const failures = new Map<string, { error: ProviderError; at: number }>();
  const inFlight = new Map<string, Promise<PriceResponse>>();

  let active = 0;
  const waiting: Array<() => void> = [];
  async function limited<T>(task: () => Promise<T>): Promise<T> {
    if (active >= PRICE_MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next)
        next(); // hand the slot over
      else active--;
    }
  }

  async function lookup(key: string, providerId: string, modelId: string): Promise<PriceResponse> {
    const provider = providers.get(providerId);
    if (!provider) throw new AppError("NOT_FOUND", `Unknown provider: ${providerId}`, 404);
    // Only ids the catalog confirms reach a provider URL (spec §6.1, AC-10) — also when the catalog is down.
    const known = await catalog.find(providerId, modelId);
    if (known === undefined) throw new AppError("NOT_FOUND", "This model is not offered by the provider", 404);
    if (known === null) {
      const error = new ProviderError(provider.id, null, "The model list couldn't be loaded");
      failures.set(key, { error, at: now() });
      throw error;
    }
    try {
      const price = provider.priceOf
        ? await limited(() =>
            (provider.priceOf as NonNullable<typeof provider.priceOf>)(modelId, AbortSignal.timeout(timeoutMs)),
          )
        : { kind: "unknown" as const };
      const at = now();
      const value: PriceResponse = { price, fetchedAt: new Date(at).toISOString() };
      cache.set(key, { value, at });
      return value;
    } catch (error) {
      if (error instanceof ProviderError) failures.set(key, { error, at: now() });
      throw error;
    }
  }

  return {
    async price(providerId: string, modelId: string): Promise<PriceResponse> {
      if (!providers.get(providerId)) throw new AppError("NOT_FOUND", `Unknown provider: ${providerId}`, 404);
      const key = `${providerId}\u0000${modelId}`;
      const hit = cache.get(key);
      if (hit && now() - hit.at < PRICE_TTL_MS) return hit.value;
      const failed = failures.get(key);
      if (failed && now() - failed.at < PRICE_FAILURE_TTL_MS) throw failed.error;
      const pending = inFlight.get(key);
      if (pending) return pending;
      const started = lookup(key, providerId, modelId).finally(() => inFlight.delete(key));
      inFlight.set(key, started);
      return started;
    },
  };
}

export type PriceCatalog = ReturnType<typeof createPriceCatalog>;
