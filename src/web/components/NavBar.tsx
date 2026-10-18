import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";
import type { Section } from "@/sections";

/** SCR-04 — brand, one entry per section (the current one marked), server status. */
export function NavBar({ sections, current }: { sections: readonly Section[]; current: Section | undefined }) {
  const health = useQuery({ queryKey: ["health"], queryFn: api.health });
  const label = health.isPending ? "checking…" : health.isSuccess ? "server ok" : "server unreachable";

  return (
    <header className="flex items-center gap-4 border-b px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:flex-col md:items-stretch md:border-r md:border-b-0 md:py-6">
      <Link to="/" className="font-semibold text-lg md:px-3">
        Ukiyo
      </Link>
      <nav aria-label="Sections" className="flex gap-1 md:flex-col">
        {sections.map((s) => {
          const Icon = s.icon;
          const isCurrent = s === current;
          return (
            <Link
              key={s.id}
              to={s.path}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isCurrent && "bg-accent font-medium",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {s.label}
            </Link>
          );
        })}
      </nav>
      <Badge variant={health.isError ? "destructive" : "secondary"} className="ml-auto md:mt-auto md:ml-3">
        {label}
      </Badge>
    </header>
  );
}
