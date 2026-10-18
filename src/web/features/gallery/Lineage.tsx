import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import { Link } from "@/lib/router";
import type { Generation } from "../../../shared/generations";

const excerpt = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s);

/** SCR-03 lineage card: the direct source and the direct derived generations — one level each way (ADR-0018). */
export function Lineage({ g }: { g: Generation }) {
  const { source, derived } = g;
  if (!source && derived.total === 0) return null;
  const how = source?.relation === "reuse" ? `Made from output ${source.output} of` : "Re-run of";
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lineage</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {source &&
          (source.exists && source.prompt !== null ? (
            <Link to={`/generations/${source.id}`} className="underline underline-offset-4">
              {`${how} «${excerpt(source.prompt)}»`}
            </Link>
          ) : (
            <p className="text-muted-foreground">{`${how} a generation — source deleted`}</p>
          ))}
        {derived.total > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-muted-foreground">Derived</p>
            <ul className="flex flex-col gap-1">
              {derived.items.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2">
                  <span>{d.relation === "rerun" ? "Re-run" : `Output ${d.output} reused`}</span>
                  <Link to={`/generations/${d.id}`} className="underline underline-offset-4">
                    {`«${excerpt(d.prompt)}»`}
                  </Link>
                  <span className="text-muted-foreground text-xs">{formatRelative(d.createdAt)}</span>
                </li>
              ))}
            </ul>
            {derived.total > derived.items.length && (
              <p className="text-muted-foreground">and {derived.total - derived.items.length} more</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
