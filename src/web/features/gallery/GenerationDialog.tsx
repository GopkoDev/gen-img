import { useInfiniteQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, X } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApiError } from "@/lib/api";
import { excerpt } from "@/lib/format";
import { dialogState, replace } from "@/lib/router";
import { DialogBusyContext, DialogEscapeContext, type EscapeHandler } from "./DialogBusy";
import { galleryQueryOptions } from "./Gallery";
import { Detail, useGeneration } from "./GenerationDetail";
import { bringCardIntoView } from "./gridPlace";
import { neighbours } from "./neighbours";

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
 * `busy` (or the `DialogBusyContext` setter T4's detail body reports through) disables stepping.
 */
export function GenerationDialog({ id, busy: busyProp = false }: { id: string; busy?: boolean }) {
  const grid = useInfiniteQuery(galleryQueryOptions);
  const detail = useGeneration(id);
  const items = grid.data?.pages.flatMap((p) => p.items) ?? [];
  const nav = neighbours(items, id);
  const [reported, setReported] = useState(0);
  const setBusy = useCallback((b: boolean) => setReported((n) => Math.max(0, n + (b ? 1 : -1))), []);
  const escapeHandler = useRef<EscapeHandler | null>(null);
  const setEscape = useCallback((h: EscapeHandler | null) => {
    escapeHandler.current = h;
  }, []);
  const busy = busyProp || reported > 0;
  const [loadingNext, setLoadingNext] = useState(false);
  const [nextFailed, setNextFailed] = useState(false);
  const idRef = useRef(id);
  idRef.current = id;
  const mounted = useRef(true);
  const closeRef = useRef<HTMLButtonElement>(null);

  // A failure belongs to the generation it happened on.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset when the shown generation changes
  useEffect(() => setNextFailed(false), [id]);

  // The last generation of the grid the dialog showed: where the grid scrolls to on close (sad §8).
  const lastGridId = useRef<string | null>(null);
  if (nav.inOrder) lastGridId.current = id;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (lastGridId.current) bringCardIntoView(lastGridId.current);
    };
  }, []);

  // Preload the first output of the loaded neighbours only (never a page load for a preload).
  const newerUrl = items.find((g) => g.id === nav.newer)?.thumbnail.url;
  const olderUrl = items.find((g) => g.id === nav.older)?.thumbnail.url;
  useEffect(() => {
    for (const url of [newerUrl, olderUrl]) if (url) new Image().src = url;
  }, [newerUrl, olderUrl]);

  const go = (to: string) => replace(`/generations/${to}`, dialogState());
  const stepNewer = () => {
    if (!busy && nav.newer) go(nav.newer);
  };
  const stepOlder = async () => {
    if (busy || loadingNext) return;
    if (nav.older) return go(nav.older);
    if (!nav.inOrder || !grid.hasNextPage || grid.isFetching) return;
    const from = id;
    setLoadingNext(true);
    setNextFailed(false);
    const r = await grid.fetchNextPage();
    if (!mounted.current) return;
    setLoadingNext(false);
    if (r.isError || !r.data) return setNextFailed(true);
    const next = neighbours(
      r.data.pages.flatMap((p) => p.items),
      from,
    ).older;
    if (next && idRef.current === from) go(next);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTextTarget(e.target)) return;
    if (e.key === "ArrowLeft") stepNewer();
    else if (e.key === "ArrowRight") void stepOlder();
  };

  const waitingForNext = loadingNext || (nav.atEnd && grid.isFetchingNextPage);
  const olderUnavailable = !nav.older && !(grid.hasNextPage && nav.inOrder);
  const title = items.find((g) => g.id === id)?.prompt ?? detail.data?.prompt;

  let body: ReactNode;
  if (detail.isPending) body = <Placeholder>Loading…</Placeholder>;
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
    <Dialog open onOpenChange={(open) => !open && window.history.back()}>
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
                  unavailable={olderUnavailable || waitingForNext}
                  disabled={busy}
                  onClick={() => void stepOlder()}
                />
              </>
            ) : (
              <span className="text-muted-foreground text-sm">Not in the gallery's current order</span>
            )}
            <DialogClose asChild>
              <Button ref={closeRef} variant="ghost" size="icon" aria-label="Close">
                <X />
              </Button>
            </DialogClose>
          </header>
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
              <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:overflow-hidden">{body}</div>
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
