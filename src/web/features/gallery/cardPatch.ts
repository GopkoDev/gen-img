import type { QueryClient } from "@tanstack/react-query";
import { RECENT_QUERY_KEY } from "@/features/generate/RecentGenerations";
import type { Generation } from "../../../shared/generations";
import { GALLERY_QUERY_KEY } from "./Gallery";
import { patchSummaries } from "./summaryPatch";

/**
 * After a comment/tag change (ADR-0034): write tags / «has comment» into that card of the loaded gallery pages
 * (exact key, no page read), refresh this generation's detail and the recent strip only.
 */
export function patchCard(
  qc: QueryClient,
  id: string,
  fields: { tags?: Generation["tags"]; comment?: Generation["comment"] },
) {
  qc.setQueryData<Generation>(["generation", id], (old) => (old ? { ...old, ...fields } : old));
  patchSummaries(qc, id, {
    ...(fields.tags ? { tags: fields.tags } : {}),
    ...("comment" in fields ? { hasComment: fields.comment !== null } : {}),
  });
  // A list refresh already in flight was read before this change and would put the old card back: refresh again.
  if (qc.isFetching({ queryKey: GALLERY_QUERY_KEY, exact: true }) > 0)
    qc.invalidateQueries({ queryKey: GALLERY_QUERY_KEY, exact: true });
  qc.invalidateQueries({ queryKey: ["generation", id] });
  qc.invalidateQueries({ queryKey: RECENT_QUERY_KEY, exact: true });
}
