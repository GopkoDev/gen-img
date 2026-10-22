import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ModelPreference } from "../../../shared/models";
import type { ProviderId } from "../../../shared/providers";

export const modelPreferencesKey = (provider: ProviderId) => ["model-preferences", provider] as const;

/** The Owner's model preferences of one provider — one cache entry shared by the panel, the picker and the Models page (ADR-0028). */
export function useModelPreferences(provider: ProviderId, enabled: boolean) {
  return useQuery({
    queryKey: modelPreferencesKey(provider),
    queryFn: () => api.modelPreferences(provider),
    enabled,
    staleTime: 0,
    retry: false,
  });
}

type Prefs = { preferences: ModelPreference[] };
type Flags = { favorite?: boolean; hidden?: boolean };
export type SetPreferenceVars = { model: string } & Flags;

const FLAGS = ["favorite", "hidden"] as const;

function upsert(old: Prefs | undefined, provider: ProviderId, model: string, change: Flags): Prefs {
  const list = old?.preferences ?? [];
  const current = list.find((p) => p.model === model);
  const next: ModelPreference = {
    provider,
    model,
    favorite: false,
    hidden: false,
    updatedAt: null,
    ...current,
    ...change,
  };
  return { preferences: current ? list.map((p) => (p.model === model ? next : p)) : [...list, next] };
}

/**
 * Change one or both flags of a model (ADR-0030): optimistic per named flag, rollback of that flag only,
 * success writes that flag only; the list is refetched once, after the last sibling mutation settles.
 */
export function useSetModelPreference(
  provider: ProviderId,
  // Hook-level (not per-`mutate`) so every overlapping mutation reports back, each with its own variables.
  opts: {
    onError?: (error: unknown, vars: SetPreferenceVars) => void;
    onSuccess?: (saved: ModelPreference, vars: SetPreferenceVars) => void;
    onSettled?: (vars: SetPreferenceVars) => void;
  } = {},
) {
  const client = useQueryClient();
  const key = modelPreferencesKey(provider);
  const mutationKey = ["set-model-preference", provider] as const;
  // The flags `v` names, valued from `from` (default: `v` itself).
  const named = (v: Flags, from: Flags = v): Flags =>
    Object.fromEntries(FLAGS.filter((f) => v[f] !== undefined).map((f) => [f, from[f]]));

  return useMutation({
    mutationKey,
    mutationFn: (v: SetPreferenceVars) => api.setModelPreference({ provider, ...v }),
    onMutate: async (v) => {
      await client.cancelQueries({ queryKey: key });
      // Remember only the named flags, so a rollback never touches another flag or model.
      const was = client.getQueryData<Prefs>(key)?.preferences.find((p) => p.model === v.model);
      const previous: Flags = Object.fromEntries(
        FLAGS.filter((f) => v[f] !== undefined).map((f) => [f, was?.[f] ?? false]),
      );
      client.setQueryData<Prefs>(key, (old) => upsert(old, provider, v.model, named(v)));
      return { previous };
    },
    onError: (error, v, ctx) => {
      if (ctx) client.setQueryData<Prefs>(key, (old) => upsert(old, provider, v.model, ctx.previous));
      opts.onError?.(error, v);
    },
    onSuccess: (saved, v) => {
      client.setQueryData<Prefs>(key, (old) => upsert(old, provider, v.model, named(v, saved)));
      opts.onSuccess?.(saved, v);
    },
    // cancelQueries may have cancelled an in-flight refetch: settle on the server's truth, but only after the last sibling.
    onSettled: (_saved, _error, v) => {
      opts.onSettled?.(v);
      if (client.isMutating({ mutationKey }) === 1) return client.invalidateQueries({ queryKey: key });
    },
  });
}
