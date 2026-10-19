import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { RECENT_QUERY_KEY } from "@/features/generate/RecentGenerations";
import type { Generation, GenerationPage } from "../../../shared/generations";
import { GALLERY_QUERY_KEY } from "./Gallery";

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
  qc.setQueryData<InfiniteData<GenerationPage>>(GALLERY_QUERY_KEY, (old) => {
    if (!old) return old;
    return {
      ...old,
      pages: old.pages.map((p) => ({
        ...p,
        items: p.items.map((c) =>
          c.id !== id
            ? c
            : {
                ...c,
                ...(fields.tags ? { tags: fields.tags } : {}),
                ...("comment" in fields ? { hasComment: fields.comment !== null } : {}),
              },
        ),
      })),
    };
  });
  qc.invalidateQueries({ queryKey: ["generation", id] });
  qc.invalidateQueries({ queryKey: RECENT_QUERY_KEY, exact: true });
}
