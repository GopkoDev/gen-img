import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** The models read behind the model choice, the one-model heading and «By model»: one cache entry under ["generations"]. */
export const modelsQueryOptions = queryOptions({
  queryKey: ["generations", "models"],
  queryFn: () => api.generationModels(4),
  staleTime: Number.POSITIVE_INFINITY, // every change to the library invalidates ["generations"]
});

const PROVIDER_NAMES: Record<string, string> = { openrouter: "OpenRouter", vercel: "Vercel AI Gateway" };
export const providerName = (id: string) => PROVIDER_NAMES[id] ?? id;
