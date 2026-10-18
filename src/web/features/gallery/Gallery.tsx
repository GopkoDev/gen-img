import { useInfiniteQuery } from "@tanstack/react-query";
import { ImageIcon, Loader2, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { Link, replace } from "@/lib/router";
import type { GenerationSummary } from "../../../shared/generations";

export const GALLERY_QUERY_KEY = ["generations"] as const;
const PENDING_REFETCH_MS = 10_000;

function Tile({ g }: { g: GenerationSummary }) {
  const [broken, setBroken] = useState(false);
  return (
    <Link
      to={`/generations/${g.id}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="gap-3 overflow-hidden py-0 transition-colors hover:bg-accent">
        <div className="flex aspect-square items-center justify-center bg-muted">
          {broken ? (
            <span className="text-muted-foreground text-sm">Image unavailable</span>
          ) : (
            <img
              src={g.thumbnail.url}
              alt={g.prompt}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          )}
        </div>
        <div className="flex flex-col gap-2 px-3 pb-3">
          <p className="line-clamp-2 text-sm">{g.prompt}</p>
          {(g.tags.length > 0 || g.hasComment) && (
            <div className="flex flex-wrap items-center gap-1">
              {g.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="max-w-full truncate">
                  {tag}
                </Badge>
              ))}
              {g.tags.length > 3 && <Badge variant="outline">+{g.tags.length - 3}</Badge>}
              {g.hasComment && (
                <MessageSquare aria-label="Has a comment" role="img" className="size-4 text-muted-foreground" />
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 flex-wrap gap-1">
              <Badge variant="secondary" className="max-w-full truncate">
                {g.provider} · {g.model}
              </Badge>
              {g.costStatus === "pending" && <Badge variant="outline">cost pending</Badge>}
              {g.inputsCount > 0 && (
                <Badge variant="outline">
                  <ImageIcon aria-hidden />
                  {g.inputsCount} input{g.inputsCount === 1 ? "" : "s"}
                </Badge>
              )}
            </span>
            <span className="text-muted-foreground text-xs">{formatRelative(g.createdAt)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** SCR-02 — newest-first gallery with on-demand paging. */
export function Gallery() {
  // A one-off notice after a deletion (SCR-01); the flag is dropped from the address right away.
  const [justDeleted] = useState(() => new URLSearchParams(window.location.search).has("deleted"));
  useEffect(() => {
    if (justDeleted) replace(window.location.pathname);
  }, [justDeleted]);
  const q = useInfiniteQuery({
    queryKey: GALLERY_QUERY_KEY,
    queryFn: ({ pageParam }) => api.generations(pageParam),
    initialPageParam: undefined as string | undefined,
    // Coming back from another section shows the loaded pages as they are (spec §6): every change that adds,
    // edits or removes a generation invalidates this key; another tab's changes still arrive on focus.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
    // Re-read while any loaded tile still waits for its price (spec §6, sad §8).
    refetchInterval: (query) =>
      query.state.data?.pages.some((p) => p.items.some((g) => g.costStatus === "pending")) ? PENDING_REFETCH_MS : false,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  if (q.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (q.isError)
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-sm">Couldn't load the gallery</p>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          Retry
        </Button>
      </div>
    );

  const items = q.data.pages.flatMap((p) => p.items);
  const notice = justDeleted && <p className="text-muted-foreground text-sm">Generation deleted.</p>;
  if (items.length === 0)
    return (
      <div className="flex flex-col items-start gap-3">
        {notice}
        <p className="text-muted-foreground">No generations yet.</p>
        <Button asChild>
          <Link to="/?focus=prompt">Write a prompt</Link>
        </Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {notice}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((g) => (
          <Tile key={g.id} g={g} />
        ))}
      </div>
      {q.hasNextPage && (
        <Button
          variant="outline"
          className="self-center"
          disabled={q.isFetchingNextPage}
          onClick={() => q.fetchNextPage()}
        >
          {q.isFetchingNextPage && <Loader2 className="animate-spin" />}
          Load more
        </Button>
      )}
    </div>
  );
}
