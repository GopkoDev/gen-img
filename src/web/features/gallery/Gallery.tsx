import { useInfiniteQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { Link } from "@/lib/router";
import type { GenerationSummary } from "../../../shared/generations";

export const GALLERY_QUERY_KEY = ["generations"] as const;

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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary" className="max-w-full truncate">
              {g.provider} · {g.model}
            </Badge>
            <span className="text-muted-foreground text-xs">{formatRelative(g.createdAt)}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** SCR-02 — newest-first gallery with on-demand paging. */
export function Gallery() {
  const q = useInfiniteQuery({
    queryKey: GALLERY_QUERY_KEY,
    queryFn: ({ pageParam }) => api.generations(pageParam),
    initialPageParam: undefined as string | undefined,
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
  if (items.length === 0)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">No generations yet.</p>
        <Button onClick={() => document.getElementById("prompt")?.focus()}>Write a prompt</Button>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
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
