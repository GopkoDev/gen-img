import type { QueryClient } from "@tanstack/react-query";
import type { GenerationSummary } from "../../../shared/generations";

type Pages = { pages: { items: GenerationSummary[]; nextCursor: string | null }[]; pageParams: unknown[] };
type Group = { count: number; items: GenerationSummary[] } & Record<string, unknown>;
type Groups = { models: Group[] };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isPages = (v: unknown): v is Pages => isRecord(v) && Array.isArray(v.pages);
const isGroups = (v: unknown): v is Groups => isRecord(v) && Array.isArray(v.models);

function apply(items: GenerationSummary[], id: string, patch: Partial<GenerationSummary> | "remove") {
  return patch === "remove"
    ? items.filter((c) => c.id !== id)
    : items.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

/**
 * Updates (or removes) one card in every cached view under ["generations"] by data shape: infinite pages and
 * model groups. The recent strip, the prompts overview and a prompt's one-group cache (["generations","recent"]) and any other shape are left alone.
 */
export function patchSummaries(qc: QueryClient, id: string, patch: Partial<GenerationSummary> | "remove") {
  for (const [key, data] of qc.getQueriesData({ queryKey: ["generations"] })) {
    if (key[1] === "recent" || key[1] === "prompts") continue;
    if (key[1] === "prompt" && key[3] === "group") continue; // group pages hold `groups`, not `items`
    if (isPages(data)) {
      qc.setQueryData(key, { ...data, pages: data.pages.map((p) => ({ ...p, items: apply(p.items, id, patch) })) });
    } else if (isGroups(data)) {
      const models = data.models
        .map((g) => {
          const items = apply(g.items, id, patch);
          return { ...g, items, count: patch === "remove" && items.length < g.items.length ? g.count - 1 : g.count };
        })
        .filter((g) => g.count > 0);
      qc.setQueryData(key, { ...data, models });
    }
  }
}
