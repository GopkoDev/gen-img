import type { Config } from "../../lib/config";
import { createOpenRouterProvider } from "./openrouter";
import type { ImageProvider } from "./port";
import { createVercelProvider } from "./vercel";

export type ProviderRegistry = {
  list(): ImageProvider[];
  get(id: string): ImageProvider | undefined;
};

export function registryOf(providers: ImageProvider[]): ProviderRegistry {
  const byId = new Map(providers.map((p) => [p.id as string, p]));
  return { list: () => [...byId.values()], get: (id) => byId.get(id) };
}

/** The adapters Ukiyo ships with, keyed by provider id. `fetch` is injectable so tests stub provider HTTP. */
export function createProviderRegistry(config: Config, fetchImpl: typeof fetch = fetch): ProviderRegistry {
  return registryOf([
    createOpenRouterProvider({ apiKey: config.openRouterApiKey, fetch: fetchImpl }),
    createVercelProvider({ apiKey: config.aiGatewayApiKey, fetch: fetchImpl }),
  ]);
}
