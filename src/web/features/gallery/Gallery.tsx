import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { ImageIcon, Loader2, MessageSquare } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { excerpt, formatRelative } from "@/lib/format";
import { dialogState, isDialogVisit, Link, navigate, replace, useRoute } from "@/lib/router";
import type { GenerationPage, GenerationSummary } from "../../../shared/generations";
import { CardBadges } from "./CardBadges";
import { clearGalleryNotice, useGalleryNotice } from "./galleryNotice";
import { isOwnScroll } from "./gridPlace";
import { usePendingCost } from "./usePendingCost";

export const GALLERY_QUERY_KEY = ["generations"] as const;
const SENTINEL_MARGIN = "600px";

/**
 * The grid's list query. The dialog (a sibling of the grid in App) reads the very same cache entry with these
 * options, so both see one flattened list and one in-flight page request; with staleTime ∞ it never refetches.
 */
export const galleryQueryOptions = infiniteQueryOptions({
  queryKey: GALLERY_QUERY_KEY,
  queryFn: ({ pageParam }) => api.generations(pageParam),
  initialPageParam: undefined as string | undefined,
  // Coming back from another section shows the loaded pages as they are (spec §6): every change that adds,
  // edits or removes a generation invalidates this key; another tab's changes still arrive on focus.
  staleTime: Number.POSITIVE_INFINITY,
  gcTime: Number.POSITIVE_INFINITY, // the loaded pages stay for the whole session, however long the Owner is away
  refetchOnWindowFocus: "always",
  getNextPageParam: (last: GenerationPage) => last.nextCursor ?? undefined,
});

/** Where the Owner left the list; kept for the page's lifetime so coming back from a detail lands in the same place. */
const savedScroll = { y: 0 };

/** Test-only: forget the saved position so one test's scroll does not leak into the next. */
export function resetGalleryScroll() {
  savedScroll.y = 0;
}

/** Mounted for pending cards only: refreshes that card's cost on its own (ADR-0031). */
function PendingCostWatcher({ g }: { g: GenerationSummary }) {
  usePendingCost(g);
  return null;
}

function Tile({ g }: { g: GenerationSummary }) {
  const [broken, setBroken] = useState(false);
  return (
    <Link
      to={`/generations/${g.id}`}
      data-generation-id={g.id}
      onClick={(e) => {
        // A plain click opens the dialog over the grid (ADR-0033); modified clicks keep the link's own behaviour.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(`/generations/${g.id}`, dialogState());
      }}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
    >
      <Card className="gap-3 overflow-hidden py-0 transition-colors hover:bg-accent">
        <div className="relative flex aspect-square items-center justify-center bg-muted">
          {broken ? (
            <span className="text-muted-foreground text-sm">Image unavailable</span>
          ) : (
            <img
              src={g.thumbnail.url}
              alt={excerpt(g.prompt)}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          )}
          <CardBadges g={g} />
          {g.costStatus === "pending" && <PendingCostWatcher g={g} />}
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
  const handedOver = useGalleryNotice(); // the dialog closed after a delete
  useEffect(() => clearGalleryNotice, []);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const q = useInfiniteQuery(galleryQueryOptions);
  // While the dialog is open the grid loads nothing by itself; after it closes the sentinel is re-armed by the
  // Owner's next scroll (never by the scroll that brought the last shown card into view).
  const paused = isDialogVisit(useRoute());
  const [armed, setArmed] = useState(true);
  useEffect(() => {
    if (paused) setArmed(false);
  }, [paused]);
  useEffect(() => {
    if (paused || armed) return;
    const onScroll = () => {
      if (isOwnScroll()) setArmed(true);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [paused, armed]);

  const ready = q.data !== undefined;
  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = q;

  // Keep the position current while the list is on screen: at unmount the next page may already have replaced it
  // and the browser clamped scrollY. Restore once the cached pages render, before the sentinel is armed.
  useEffect(() => {
    const onScroll = () => {
      savedScroll.y = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useLayoutEffect(() => {
    if (ready && savedScroll.y > 0) window.scrollTo(0, savedScroll.y);
  }, [ready]);

  // Armed only while a request is allowed: more pages, nothing in flight (a full refresh included: paging would
  // cancel it), the last one not failed (no auto retry).
  const canLoadMore = ready && !paused && armed && hasNextPage && !q.isFetching && !isFetchNextPageError;
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
  if (q.isError && !q.data)
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-sm">Couldn't load the gallery</p>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          Retry
        </Button>
      </div>
    );

  const items = q.data.pages.flatMap((p) => p.items);
  const notice = (justDeleted || handedOver) && <p className="text-muted-foreground text-sm">Generation deleted.</p>;
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
      {q.isError && !isFetchNextPageError && (
        <p className="flex items-center gap-2 text-muted-foreground text-sm">
          These cards may be out of date.
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => q.refetch()}>
            Refresh
          </Button>
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((g) => (
          <Tile key={g.id} g={g} />
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
