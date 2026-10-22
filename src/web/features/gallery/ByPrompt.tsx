import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { excerpt } from "@/lib/format";
import { Link } from "@/lib/router";
import type { PromptGroup, PromptGroupPage } from "../../../shared/generations";
import { SENTINEL_MARGIN } from "./Gallery";
import { showView } from "./GalleryViews";
import { viewKey, viewSearch } from "./galleryView";
import { providerName } from "./modelsQuery";
import { useSavedScroll } from "./scrollMemory";

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** SCR-11 — one card per distinct prompt (reused ones; single-use on request), paged like the grid. */
export function ByPrompt({ single }: { single: boolean }) {
  const view = { kind: "prompts", single } as const;
  const switchId = useId();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const q = useInfiniteQuery({
    queryKey: viewKey(view),
    queryFn: ({ pageParam }) => api.promptGroups(pageParam, single),
    initialPageParam: undefined as string | undefined,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
    getNextPageParam: (last: PromptGroupPage) => last.nextCursor ?? undefined,
  });
  const groups = q.data?.pages.flatMap((p) => p.groups);
  const empty = groups?.length === 0;
  // An empty page tells "none reused" from "no generations at all" by the plain list (single-use shows everything).
  // One card is enough to tell, and it leaves the All grid's pages alone (a change re-reads only this probe).
  const any = useQuery({
    queryKey: ["generations", "probe"],
    queryFn: () => api.generations(undefined, 1),
    enabled: empty === true && !single,
  });
  useSavedScroll(view, groups !== undefined);

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = q;
  const canLoadMore = groups !== undefined && hasNextPage && !q.isFetching && !isFetchNextPageError;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!canLoadMore || !el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) fetchNextPage();
      },
      { rootMargin: SENTINEL_MARGIN },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canLoadMore, fetchNextPage]);

  if (q.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (q.isError && !groups)
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-sm">Couldn't load your prompts.</p>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          Try again
        </Button>
      </div>
    );

  const toggle = (
    <div className="flex items-center gap-2">
      <Switch id={switchId} checked={single} onCheckedChange={(on) => showView({ kind: "prompts", single: on })} />
      <label htmlFor={switchId} className="text-sm">
        Include single-use prompts
      </label>
    </div>
  );

  if (groups?.length === 0) {
    if (!single && any.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
    const noGenerations = single || (any.data?.items.length ?? 0) === 0;
    if (noGenerations && !(any.isError && !any.data))
      return (
        <div className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">No generations yet.</p>
          <Button asChild>
            <Link to="/?focus=prompt">Write a prompt</Link>
          </Button>
        </div>
      );
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">No prompt is used more than once yet.</p>
        {toggle}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {toggle}
      {q.isError && !isFetchNextPageError && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-muted-foreground text-sm">These may be out of date.</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {groups?.map((g) => (
          <GroupCard key={g.key} g={g} single={single} />
        ))}
      </div>
      {isFetchNextPageError && (
        <div className="flex items-center gap-3 self-center text-sm">
          <p className="text-destructive">Couldn't load more.</p>
          <Button variant="outline" size="sm" disabled={q.isFetching} onClick={() => fetchNextPage()}>
            Try again
          </Button>
        </div>
      )}
      {hasNextPage ? (
        <>
          <div ref={sentinelRef} data-testid="gallery-sentinel" aria-hidden className="h-px" />
          {!isFetchNextPageError && (
            <div className="flex items-center justify-center gap-3">
              {isFetchingNextPage && (
                <span className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading more…
                </span>
              )}
              <Button variant="outline" disabled={q.isFetching} onClick={() => fetchNextPage()}>
                Load more
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-muted-foreground text-sm">That's everything</p>
      )}
    </div>
  );
}

function GroupCard({ g, single }: { g: PromptGroup; single: boolean }) {
  const [broken, setBroken] = useState(false);
  return (
    <Link
      to={`/gallery${viewSearch({ kind: "prompt", key: g.key, ...(single ? { single: true } : {}) })}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="gap-3 overflow-hidden py-0 transition-colors hover:bg-accent">
        <div className="relative flex aspect-square items-center justify-center bg-muted">
          {broken ? (
            <span className="text-muted-foreground text-sm">Image unavailable</span>
          ) : (
            <img
              src={g.cover.url}
              alt={excerpt(g.prompt)}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          )}
        </div>
        <div className="flex flex-col gap-2 px-3 pb-3">
          <p className="line-clamp-2 whitespace-pre-line text-sm" title={g.prompt}>
            {g.prompt}
          </p>
          <p className="text-muted-foreground text-xs">
            {plural(g.count, "generation")} · {plural(g.images, "image")}
          </p>
          <span className="flex min-w-0 flex-wrap gap-1">
            {g.models.map((m) => (
              <Badge
                key={`${m.provider}\n${m.model}`}
                variant="secondary"
                className="max-w-full truncate"
                title={providerName(m.provider)}
              >
                {m.model}
              </Badge>
            ))}
            {g.moreModels > 0 && <Badge variant="outline">+{g.moreModels}</Badge>}
          </span>
        </div>
      </Card>
    </Link>
  );
}
