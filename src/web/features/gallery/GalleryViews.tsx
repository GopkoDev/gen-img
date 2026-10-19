import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { navigate } from "@/lib/router";
import { type GalleryView, viewSearch } from "./galleryView";
import { modelsQueryOptions, providerName } from "./modelsQuery";
import { useGalleryView } from "./useGalleryView";

export function showView(view: GalleryView) {
  navigate(`/gallery${viewSearch(view)}`);
}

/** SCR-02 — the view switch (All / By model) and the model choice. */
export function GalleryViews() {
  const view = useGalleryView();
  const [open, setOpen] = useState(false);
  const models = useQuery({ ...modelsQueryOptions, enabled: open });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant={view.kind === "all" ? "secondary" : "outline"}
        size="sm"
        aria-pressed={view.kind === "all"}
        onClick={() => showView({ kind: "all" })}
      >
        All
      </Button>
      <Button
        variant={view.kind === "models" ? "secondary" : "outline"}
        size="sm"
        aria-pressed={view.kind === "models"}
        onClick={() => showView({ kind: "models" })}
      >
        By model
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant={view.kind === "model" ? "secondary" : "outline"} size="sm">
            {view.kind === "model" ? `Model: ${view.model}` : "Choose a model"}
            <ChevronDown aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="flex max-h-96 w-96 max-w-[90vw] flex-col gap-1 overflow-y-auto p-2">
          {models.isError && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <p className="text-sm">{models.data ? "These may be out of date." : "Couldn't load your models."}</p>
              <Button variant="outline" size="sm" onClick={() => models.refetch()}>
                Try again
              </Button>
            </div>
          )}
          {models.data
            ? models.data.models.map((g) => (
                <Button
                  key={`${g.provider}\n${g.model}`}
                  variant="ghost"
                  className="h-auto justify-between gap-3 py-2 text-left"
                  onClick={() => {
                    setOpen(false);
                    showView({ kind: "model", provider: g.provider, model: g.model });
                  }}
                >
                  <span className="flex min-w-0 flex-col items-start">
                    <span className="max-w-full truncate">{g.model}</span>
                    <span className="text-muted-foreground text-xs">{providerName(g.provider)}</span>
                  </span>
                  <Badge variant="secondary">{g.count}</Badge>
                </Button>
              ))
            : !models.isError && <p className="p-2 text-muted-foreground text-sm">Loading models…</p>}
        </PopoverContent>
      </Popover>
    </div>
  );
}
