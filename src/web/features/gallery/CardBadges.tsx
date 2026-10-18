import { Badge } from "@/components/ui/badge";
import { formatCostBadge, formatCount, formatDuration, formatSize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { GenerationSummary } from "../../../shared/generations";

/** SCR-02 — one-line strip along the bottom of a card's preview: cost · duration · size · count. */
export function CardBadges({ g }: { g: GenerationSummary }) {
  const count = formatCount(g.imagesReceived, g.imagesRequested);
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> is a form control grouping; this is a read-only badge row
    <div
      role="group"
      aria-label="Cost, duration and size"
      className="absolute inset-x-0 bottom-0 flex flex-nowrap items-center gap-1 overflow-hidden bg-background/90 px-2 py-1 text-foreground text-xs"
    >
      <Badge
        variant={g.costStatus === "known" ? "secondary" : "outline"}
        className={cn(g.costStatus === "unavailable" && "text-muted-foreground")}
      >
        {formatCostBadge(g.costMicros, g.costStatus)}
      </Badge>
      <Badge variant="outline">{formatDuration(g.durationMs)}</Badge>
      <Badge variant="outline">{formatSize(g.thumbnail.width, g.thumbnail.height)}</Badge>
      {count && <Badge variant="outline">{count}</Badge>}
    </div>
  );
}
