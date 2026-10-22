import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import type { GenerationSummary } from "../../../shared/generations";
import { patchSummaries } from "./summaryPatch";

const PENDING_REFETCH_MS = 10_000;

/**
 * Keeps one pending card current (ADR-0031): reads only that generation every 10 s, and once its cost is
 * settled patches that card in the loaded gallery pages (exact key, no invalidation, so nothing else refetches).
 */
export function usePendingCost(g: GenerationSummary) {
  const client = useQueryClient();
  const pending = g.costStatus === "pending";
  const q = useQuery({
    queryKey: ["generation", g.id],
    queryFn: () => api.generation(g.id),
    enabled: pending,
    refetchInterval: pending ? PENDING_REFETCH_MS : false,
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: false,
  });

  const settled = q.data && q.data.costStatus !== "pending" ? q.data : undefined;
  useEffect(() => {
    if (!settled) return;
    patchSummaries(client, settled.id, { costMicros: settled.costMicros, costStatus: settled.costStatus });
  }, [client, settled]);
}
