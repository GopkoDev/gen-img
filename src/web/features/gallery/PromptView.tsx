import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { Link } from "@/lib/router";
import type { PromptKey } from "../../../shared/generations";

const COLLAPSED_LINES = 6;

/** The one-group read behind the prompt grid's heading; a 404 means the key matches nothing. */
export function usePromptGroup(key: PromptKey, enabled: boolean) {
  return useQuery({
    queryKey: ["generations", "prompt", key, "group"],
    queryFn: () => api.promptGroup(key),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: (n, err) => !(err instanceof ApiError && err.status === 404) && n < 2,
  });
}

export const isNotFound = (err: unknown) => err instanceof ApiError && err.status === 404;

/** SCR-02 — the unknown-key state of a prompt view (AC-07). */
export function PromptUnknown() {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground">No generations use this prompt any more.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/gallery?view=prompts">Back to prompts</Link>
        </Button>
        <Button asChild>
          <Link to="/gallery">Show all generations</Link>
        </Button>
      </div>
    </div>
  );
}

/** SCR-02 — the prompt view's heading: the full prompt (collapsed beyond 6 lines), the count and the way out. */
export function PromptHeading({ prompt, count }: { prompt?: string; count?: number }) {
  const [expanded, setExpanded] = useState(false);
  const long = prompt !== undefined && prompt.split("\n").length > COLLAPSED_LINES;
  return (
    <div className="flex flex-col gap-2">
      {prompt !== undefined && (
        <h3 className={`whitespace-pre-wrap font-medium ${long && !expanded ? "line-clamp-6" : ""}`}>{prompt}</h3>
      )}
      {long && (
        <Button variant="link" size="sm" className="h-auto self-start p-0" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {count !== undefined && (
          <p className="text-muted-foreground text-sm">
            {count} generation{count === 1 ? "" : "s"}
          </p>
        )}
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link to="/gallery?view=prompts">Back to prompts</Link>
        </Button>
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link to="/gallery">Show all generations</Link>
        </Button>
      </div>
    </div>
  );
}
