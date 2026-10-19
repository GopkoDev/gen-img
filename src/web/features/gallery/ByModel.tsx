import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import type { ModelGroup } from "../../../shared/generations";
import { viewSearch } from "./galleryView";
import { modelsQueryOptions, providerName } from "./modelsQuery";
import { useSavedScroll } from "./scrollMemory";
import { Tile } from "./Tile";

/** SCR-10 — one section per provider + model: its count and its latest cards. */
export function ByModel() {
  const q = useQuery(modelsQueryOptions);
  useSavedScroll({ kind: "models" }, q.data !== undefined);
  if (q.isPending) return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (q.isError && !q.data)
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-sm">Couldn't load the models.</p>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          Try again
        </Button>
      </div>
    );
  if (q.data.models.length === 0)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">No generations yet.</p>
        <Button asChild>
          <Link to="/?focus=prompt">Write a prompt</Link>
        </Button>
      </div>
    );
  return (
    <div className="flex flex-col gap-8">
      {q.isError && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-sm">These may be out of date.</p>
          <Button variant="outline" size="sm" onClick={() => q.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {q.data.models.map((g) => (
        <ModelSection key={`${g.provider}\n${g.model}`} g={g} />
      ))}
    </div>
  );
}

function ModelSection({ g }: { g: ModelGroup }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 id={id} className="truncate font-medium">
            {g.model}
          </h3>
          <p className="text-muted-foreground text-sm">
            {providerName(g.provider)} · {g.count} generation{g.count === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link to={`/gallery${viewSearch({ kind: "model", provider: g.provider, model: g.model })}`}>
            Show all {g.count}
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {g.items.slice(0, 4).map((s) => (
          <Tile
            key={s.id}
            g={s}
            views={{ grid: { kind: "models" }, order: { kind: "model", provider: g.provider, model: g.model } }}
          />
        ))}
      </div>
    </section>
  );
}
