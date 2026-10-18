import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GALLERY_QUERY_KEY } from "@/features/gallery/Gallery";
import { api } from "@/lib/api";
import { Link } from "@/lib/router";
import type { GenerationSummary } from "../../../shared/generations";

const RECENT = 10;
/** A child of the gallery key: every change that invalidates the gallery refreshes this too (ADR-0025). */
export const RECENT_QUERY_KEY = [...GALLERY_QUERY_KEY, "recent"] as const;

function Thumb({ g }: { g: GenerationSummary }) {
  const [broken, setBroken] = useState(false);
  return (
    <Link
      to={`/generations/${g.id}`}
      className="block aspect-square overflow-hidden rounded-md border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {broken ? (
        <span className="flex h-full items-center justify-center p-1 text-center text-muted-foreground text-xs">
          Image unavailable
        </span>
      ) : (
        <img
          src={g.thumbnail.url}
          alt={g.prompt}
          loading="lazy"
          className="h-full w-full object-cover transition-opacity hover:opacity-80"
          onError={() => setBroken(true)}
        />
      )}
    </Link>
  );
}

/** SCR-06 — the ten latest generations next to the generate form; no paging (the gallery pages). */
export function RecentGenerations() {
  const q = useQuery({
    queryKey: RECENT_QUERY_KEY,
    queryFn: () => api.generations(undefined, RECENT),
    // Like the gallery (ADR-0023): coming back reloads nothing; changes invalidate it, focus catches other tabs.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
  });

  let body: ReactNode;
  if (q.isPending) body = <p className="text-muted-foreground text-sm">Loading…</p>;
  else if (q.isError)
    body = (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-sm">Couldn't load recent generations</p>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          Retry
        </Button>
      </div>
    );
  else if (q.data.items.length === 0) body = <p className="text-muted-foreground text-sm">No generations yet.</p>;
  else
    body = (
      <div className="grid grid-cols-4 gap-2 xl:grid-cols-5">
        {q.data.items.slice(0, RECENT).map((g) => (
          <Thumb key={g.id} g={g} />
        ))}
      </div>
    );

  return (
    <section aria-label="Recent generations">
      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardContent>{body}</CardContent>
      </Card>
    </section>
  );
}
