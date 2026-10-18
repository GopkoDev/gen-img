import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ProviderId } from "../../../shared/providers";

export const modelPreferencesKey = (provider: ProviderId) => ["model-preferences", provider] as const;

/** The Owner's model preferences of one provider — one cache entry shared by the panel and the picker (ADR-0028). */
export function useModelPreferences(provider: ProviderId, enabled: boolean) {
  return useQuery({
    queryKey: modelPreferencesKey(provider),
    queryFn: () => api.modelPreferences(provider),
    enabled,
    staleTime: 0,
    retry: false,
  });
}
