import { ImageIcon, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { excerpt, formatRelative } from "@/lib/format";
import { dialogState, Link, navigate } from "@/lib/router";
import type { GenerationSummary } from "../../../shared/generations";
import { CardBadges } from "./CardBadges";
import type { GalleryView } from "./galleryView";
import { usePendingCost } from "./usePendingCost";

const ALL: GalleryView = { kind: "all" };

/** Mounted for pending cards only: refreshes that card's cost on its own (ADR-0031). */
function PendingCostWatcher({ g }: { g: GenerationSummary }) {
  usePendingCost(g);
  return null;
}

export function Tile({ g, views }: { g: GenerationSummary; views?: { grid: GalleryView; order: GalleryView } }) {
  const [broken, setBroken] = useState(false);
  return (
    <Link
      to={`/generations/${g.id}`}
      data-generation-id={g.id}
      onClick={(e) => {
        // A plain click opens the dialog over the grid (ADR-0033); modified clicks keep the link's own behaviour.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(`/generations/${g.id}`, dialogState(views ?? { grid: ALL, order: ALL }));
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
