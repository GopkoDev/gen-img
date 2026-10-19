import { useQuery } from "@tanstack/react-query";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api";
import { Link } from "@/lib/router";
import type { PromptKey } from "../../../shared/generations";
import { viewSearch } from "./galleryView";

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

const backToPrompts = (single: boolean) => `/gallery${viewSearch({ kind: "prompts", single })}`;

/** SCR-02 — the unknown-key state of a prompt view (AC-07). */
export function PromptUnknown({ single = false }: { single?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-muted-foreground">No generations use this prompt any more.</p>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to={backToPrompts(single)}>Back to prompts</Link>
        </Button>
        <Button asChild>
          <Link to="/gallery">Show all generations</Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * SCR-02 — the prompt view's heading: the full prompt (clamped to 6 lines, expandable when it overflows), the count
 * (or «count unavailable» with a retry) and the way out.
 */
export function PromptHeading({
  prompt,
  count,
  countFailed = false,
  onRetry,
  single = false,
}: {
  prompt?: string;
  count?: number;
  countFailed?: boolean;
  onRetry?: () => void;
  single?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLHeadingElement>(null);
  const textId = useId();
  const newlines = prompt !== undefined && prompt.split("\n").length > COLLAPSED_LINES;
  // Measured while clamped (an expanded text always fits) and again whenever the width changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the text and the clamp are what is measured
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [prompt, expanded]);
  const toggle = expanded || overflows || newlines;
  return (
    <div className="flex flex-col gap-2">
      {prompt !== undefined && (
        <h3 id={textId} ref={ref} className={`whitespace-pre-wrap font-medium ${expanded ? "" : "line-clamp-6"}`}>
          {prompt}
        </h3>
      )}
      {toggle && (
        <Button
          variant="link"
          size="sm"
          className="h-auto self-start p-0"
          aria-expanded={expanded}
          aria-controls={textId}
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {count !== undefined && (
          <p className="text-muted-foreground text-sm">
            {count} generation{count === 1 ? "" : "s"}
          </p>
        )}
        {countFailed && (
          <p className="flex items-center gap-1 text-muted-foreground text-sm">
            count unavailable ·
            <Button variant="link" size="sm" className="h-auto p-0" onClick={onRetry}>
              Try again
            </Button>
          </p>
        )}
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link to={backToPrompts(single)}>Back to prompts</Link>
        </Button>
        <Button asChild variant="link" size="sm" className="h-auto p-0">
          <Link to="/gallery">Show all generations</Link>
        </Button>
      </div>
    </div>
  );
}
