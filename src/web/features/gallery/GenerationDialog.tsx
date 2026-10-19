import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { excerpt } from "@/lib/format";
import { dialogState, replace } from "@/lib/router";
import { DialogBusyContext, DialogDeleteContext, DialogEscapeContext, type EscapeHandler } from "./DialogBusy";
import { GALLERY_QUERY_KEY, galleryQueryOptionsFor } from "./Gallery";
import { Detail, useGeneration } from "./GenerationDetail";
import { showGalleryNotice } from "./galleryNotice";
import { bringCardIntoView } from "./gridPlace";
import { anchoredAtEnd, neighbours } from "./neighbours";
import { patchSummaries } from "./summaryPatch";
import { useOrderView } from "./useGalleryView";

const isTextTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || t.getAttribute("contenteditable") === "true" || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

function Step({
  label,
  icon,
  tip,
  unavailable,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tip: string;
  unavailable: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-disabled={unavailable || disabled}
            onClick={() => !unavailable && onClick()}
          >
            {label === "Newer" && icon}
            {label}
            {label === "Older" && icon}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

/**
 * SCR-09 — one generation in a dialog over the grid, stepping through the grid's loaded order.
 *
 * Grid state is shared through the TanStack cache: this reads the same infinite query as the Gallery
 * (`galleryQueryOptions`, staleTime ∞ so it never refetches by itself). Its `fetchNextPage` is the grid's own
 * request (deduped), only ever called here when stepping past the end; the Gallery pauses its sentinel from the route.
 * The `DialogBusyContext` setter the detail body reports through (and a delete in progress) disables stepping.
 */
export function GenerationDialog({ id }: { id: string }) {
  const { grid: behind, order } = useOrderView();
  const grid = useInfiniteQuery(galleryQueryOptionsFor(order));
  const detail = useGeneration(id);
  const items = grid.data?.pages.flatMap((p) => p.items) ?? [];
  // A refresh can push the shown, last loaded generation off the tail of the list: keep it at the end of the order
  // (it was in the order, more pages exist, it is older than everything loaded). A lineage hop never was in it.
  const anchorFor = useRef<string | null>(null);
  let nav = neighbours(items, id);
  if (!nav.inOrder && anchorFor.current === id && grid.hasNextPage) nav = anchoredAtEnd(items, id) ?? nav;
  if (nav.inOrder) anchorFor.current = id;
  const refreshing = grid.isFetching; // read during render so a refresh re-renders the dialog
  const [reported, setReported] = useState(0);
  const setBusy = useCallback((b: boolean) => setReported((n) => Math.max(0, n + (b ? 1 : -1))), []);
  const escapeHandler = useRef<EscapeHandler | null>(null);
  const setEscape = useCallback((h: EscapeHandler | null) => {
    escapeHandler.current = h;
  }, []);
  const [deleting, setDeleting] = useState(false);
  const busy = reported > 0 || deleting;
  const [loadingNext, setLoadingNext] = useState(false);
  const [queued, setQueued] = useState<string | null>(null);
  const [nextFailed, setNextFailed] = useState(false);
  const idRef = useRef(id);
  idRef.current = id;
  const mounted = useRef(true);
  // Every close path goes back at most once per visit (a double Esc, an overlay click after Esc, a delete finishing).
  const closingRef = useRef(false);
  const close = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    window.history.back();
  };
  const closeRef = useRef<HTMLButtonElement>(null);

  // A failure belongs to the generation it happened on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the shown generation changes
  useEffect(() => setNextFailed(false), [id]);

  // The last generation of the grid the dialog showed: where the grid scrolls to on close (sad §8).
  const lastGridId = useRef<string | null>(null);
  const keepsScroll = useRef(false);
  keepsScroll.current = behind.kind === "models"; // «By model» keeps its scroll on close (sad §4)
  if (nav.inOrder) lastGridId.current = id;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (lastGridId.current && !keepsScroll.current) bringCardIntoView(lastGridId.current);
    };
  }, []);

  // Preload the first output of the loaded neighbours only (never a page load for a preload).
  const newerUrl = items.find((g) => g.id === nav.newer)?.thumbnail.url;
  const olderUrl = items.find((g) => g.id === nav.older)?.thumbnail.url;
  useEffect(() => {
    for (const url of [newerUrl, olderUrl]) if (url) new Image().src = url;
  }, [newerUrl, olderUrl]);

  const go = (to: string) => replace(`/generations/${to}`, dialogState({ grid: behind, order }));
  const stepNewer = () => {
    if (!busy && nav.newer) go(nav.newer);
  };
  const stepOlder = async () => {
    if (queued === id) return;
    await olderStep();
  };
  const olderStep = async () => {
    if (busy || loadingNext) return;
    if (nav.older) return go(nav.older);
    if (!nav.inOrder || !grid.hasNextPage) return;
    if (refreshing) return setQueued(id); // the list is being refreshed: step once it has settled
    const from = id;
    setLoadingNext(true);
    setNextFailed(false);
    const r = await grid.fetchNextPage();
    if (!mounted.current) return;
    setLoadingNext(false);
    if (r.isError || !r.data) return setNextFailed(true);
    const next = r.data.pages.flatMap((p) => p.items).find((g) => g.id < from)?.id;
    if (next && idRef.current === from) go(next);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the refresh settles, with this render's state
  useEffect(() => {
    if (queued === null || refreshing) return;
    setQueued(null);
    if (queued === idRef.current) void olderStep();
  }, [queued, refreshing]);

  // After a delete: choose from the order as it was before it, show the neighbour in place (address replaced), or
  // close onto the grid with the notice handed over. The deleted card leaves the grid either way.
  const qc = useQueryClient();
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null);
  useEffect(() => setDeletedNotice((n) => (n === id ? n : null)), [id]);
  const afterDelete = async (deletedId: string) => {
    setDeleting(true);
    const before = nav;
    const loadNext = !before.older && before.inOrder && before.atEnd && grid.hasNextPage;
    // The card leaves the grid first: a failed page load afterwards then keeps its own error on the grid.
    patchSummaries(qc, deletedId, "remove");
    let target = before.older;
    let pageFailed = false;
    if (loadNext) {
      const r = await grid.fetchNextPage();
      if (r.isError || !r.data) pageFailed = true;
      else target = r.data.pages.flatMap((p) => p.items).find((g) => g.id < deletedId)?.id ?? null;
    }
    if (!pageFailed) target ??= before.newer;
    if (!pageFailed) qc.invalidateQueries({ queryKey: GALLERY_QUERY_KEY });
    if (!mounted.current || closingRef.current) {
      showGalleryNotice(); // closed meanwhile: the grid says so, and no second Back
    } else if (target) {
      setDeletedNotice(target);
      setDeleting(false);
      go(target);
    } else {
      showGalleryNotice();
      close();
    }
    qc.removeQueries({ queryKey: ["generation", deletedId] });
    qc.invalidateQueries({ queryKey: ["generation-job"] }); // the panel's latest result may be this one
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTextTarget(e.target)) return;
    if (e.key === "ArrowLeft") stepNewer();
    else if (e.key === "ArrowRight") void stepOlder();
  };

  const waitingForNext = loadingNext || queued === id || (nav.atEnd && !!grid.hasNextPage && refreshing);
  const olderUnavailable = !nav.older && !(grid.hasNextPage && nav.inOrder);
  const title = deleting ? undefined : (items.find((g) => g.id === id)?.prompt ?? detail.data?.prompt);

  let body: ReactNode;
  if (deleting) body = <Placeholder>Generation deleted.</Placeholder>;
  else if (detail.isPending) body = <Placeholder>Loading…</Placeholder>;
  else if (detail.isError && detail.error instanceof ApiError && detail.error.status === 404)
    body = <Placeholder>This generation no longer exists.</Placeholder>;
  else if (detail.isError)
    body = (
      <Placeholder>
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <p className="text-sm">Couldn't load this generation</p>
          <Button variant="outline" size="sm" onClick={() => detail.refetch()}>
            Try again
          </Button>
        </div>
      </Placeholder>
    );
  else body = <Detail key={id} g={detail.data} layout="dialog" />;

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="flex h-[90vh] flex-col gap-0 p-0 sm:max-w-6xl"
        onKeyDown={onKeyDown}
        onEscapeKeyDown={(e) => {
          if (escapeHandler.current?.()) e.preventDefault();
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          closeRef.current?.focus();
        }}
        onCloseAutoFocus={(e) => {
          // Back to the grid card last shown, not to <body>; the scroll is the grid's own business (bringCardIntoView).
          const card = lastGridId.current
            ? document.querySelector<HTMLElement>(`[data-generation-id="${CSS.escape(lastGridId.current)}"]`)
            : null;
          const target = card?.matches("a, button") ? card : card?.querySelector<HTMLElement>("a, button");
          if (!target) return;
          e.preventDefault();
          target.focus({ preventScroll: true });
        }}
      >
        <TooltipProvider>
          <header className="flex shrink-0 items-center gap-2 border-b px-6 py-3">
            <DialogTitle className="min-w-0 flex-1 truncate">{title ? excerpt(title) : "Generation"}</DialogTitle>
            <DialogDescription className="sr-only">One generation of the gallery</DialogDescription>
            {nav.inOrder ? (
              <>
                <Step
                  label="Newer"
                  icon={<ChevronLeft />}
                  tip={
                    busy
                      ? "Save or cancel your changes first"
                      : nav.newer
                        ? "Newer generation (←)"
                        : "No newer generation"
                  }
                  unavailable={!nav.newer}
                  disabled={busy}
                  onClick={stepNewer}
                />
                <Step
                  label="Older"
                  icon={waitingForNext ? <Loader2 className="animate-spin" /> : <ChevronRight />}
                  tip={
                    busy
                      ? "Save or cancel your changes first"
                      : olderUnavailable
                        ? "No older generation"
                        : "Older generation (→)"
                  }
                  unavailable={olderUnavailable || loadingNext || queued === id}
                  disabled={busy}
                  onClick={() => void stepOlder()}
                />
              </>
            ) : grid.isPending ? null : (
              <span className="text-muted-foreground text-sm">Not in the gallery's current order</span>
            )}
            <DialogClose asChild>
              <Button ref={closeRef} variant="ghost" size="icon" aria-label="Close">
                <X />
              </Button>
            </DialogClose>
          </header>
          {deletedNotice === id && (
            <p role="status" className="shrink-0 border-b bg-muted px-6 py-2 text-sm">
              Generation deleted.
            </p>
          )}
          {nextFailed && (
            <p className="flex shrink-0 items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-6 py-2 text-sm">
              Couldn't load the next one.
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void stepOlder()}>
                Try again
              </Button>
            </p>
          )}
          <DialogBusyContext.Provider value={setBusy}>
            <DialogEscapeContext.Provider value={setEscape}>
              <DialogDeleteContext.Provider value={afterDelete}>
                <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:overflow-hidden">{body}</div>
              </DialogDeleteContext.Provider>
            </DialogEscapeContext.Provider>
          </DialogBusyContext.Provider>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

/** Loading / error / gone: the same two columns, the message in the metadata one. */
function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="aspect-[4/3] rounded-lg bg-muted" />
      <div className="text-muted-foreground text-sm">{children}</div>
    </div>
  );
}
