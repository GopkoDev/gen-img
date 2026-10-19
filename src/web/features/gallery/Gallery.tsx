import { infiniteQueryOptions, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { isDialogVisit, Link, replace, useRoute } from "@/lib/router";
import type { GenerationPage } from "../../../shared/generations";
import { ByModel } from "./ByModel";
import { ByPrompt } from "./ByPrompt";
import { showView } from "./GalleryViews";
import { clearGalleryNotice, useGalleryNotice } from "./galleryNotice";
import { type GalleryView, viewKey } from "./galleryView";
import { isOwnScroll } from "./gridPlace";
import { modelsQueryOptions, providerName } from "./modelsQuery";
import { resetGalleryScroll, useSavedScroll } from "./scrollMemory";
import { Tile } from "./Tile";
import { useGalleryView } from "./useGalleryView";

/** A view with a paged list behind it: «By model» has none (its read is the models query). */
export type ListView = Exclude<GalleryView, { kind: "models" | "prompts" }>;

export const GALLERY_QUERY_KEY = ["generations"] as const;
export const SENTINEL_MARGIN = "600px";

/**
 * The grid's list query. The dialog (a sibling of the grid in App) reads the very same cache entry with these
 * options, so both see one flattened list and one in-flight page request; with staleTime ∞ it never refetches.
 */
export function galleryQueryOptionsFor(view: ListView) {
  const filter = view.kind === "model" ? { provider: view.provider, model: view.model } : undefined;
  return infiniteQueryOptions({
    queryKey: viewKey(view),
    queryFn: ({ pageParam }) => (filter ? api.generations(pageParam, undefined, filter) : api.generations(pageParam)),
    initialPageParam: undefined as string | undefined,
    // Coming back from another section shows the loaded pages as they are (spec §6): every change that adds,
    // edits or removes a generation invalidates this key; another tab's changes still arrive on focus.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY, // the loaded pages stay for the whole session, however long the Owner is away
    refetchOnWindowFocus: "always",
    getNextPageParam: (last: GenerationPage) => last.nextCursor ?? undefined,
  });
}

export const galleryQueryOptions = galleryQueryOptionsFor({ kind: "all" });

export { resetGalleryScroll };

/** The gallery's body for the view in the address: the grid (all or one model) or «By model». */
export function Gallery() {
  const view = useGalleryView();
  if (view.kind === "models") return <ByModel />;
  if (view.kind === "prompts") return <ByPrompt single={view.single} />;
  // One grid per view: its own query, scroll position and paging state.
  return <Grid key={JSON.stringify(viewKey(view))} view={view} />;
}

/** SCR-02 — newest-first grid (all generations or one model's) with on-demand paging. */
function Grid({ view }: { view: ListView }) {
  const one = view.kind === "model" ? view : undefined;
  const models = useQuery({ ...modelsQueryOptions, enabled: one !== undefined });
  // A one-off notice after a deletion (SCR-01); the flag is dropped from the address right away.
  const [justDeleted, setJustDeleted] = useState(() => new URLSearchParams(window.location.search).has("deleted"));
  useEffect(() => {
    if (justDeleted) replace(window.location.pathname);
  }, [justDeleted]);
  const handedOver = useGalleryNotice(); // the dialog closed after a delete
  useEffect(() => clearGalleryNotice, []);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const q = useInfiniteQuery(galleryQueryOptionsFor(view));
  // While the dialog is open the grid loads nothing by itself; after it closes the sentinel is re-armed by the
  // Owner's next scroll (never by the scroll that brought the last shown card into view).
  const paused = isDialogVisit(useRoute());
  const [armed, setArmed] = useState(true);
  useEffect(() => {
    if (!paused) return;
    setArmed(false);
    // A notice belongs to the visit that showed it: it does not wait for a later dialog to be closed.
    setJustDeleted(false);
    clearGalleryNotice();
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

  useSavedScroll(view, ready);

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
  if (items.length === 0 && one)
    return (
      <div className="flex flex-col items-start gap-3">
        {notice}
        <p className="text-muted-foreground">
          No generations with {one.model} ({providerName(one.provider)}).
        </p>
        <Button onClick={() => showView({ kind: "all" })}>Show all generations</Button>
      </div>
    );
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
      {one && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">{modelHeading(one, models.data?.models)}</h3>
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => showView({ kind: "all" })}>
            Show all generations
          </Button>
        </div>
      )}
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
          <Tile key={g.id} g={g} views={{ grid: view, order: view }} />
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

function modelHeading(
  one: { provider: string; model: string },
  models: { provider: string; model: string; count: number }[] | undefined,
) {
  const count = models?.find((g) => g.provider === one.provider && g.model === one.model)?.count;
  const head = `${one.model} · ${providerName(one.provider)}`;
  return count === undefined ? head : `${head} · ${count} generation${count === 1 ? "" : "s"}`;
}
