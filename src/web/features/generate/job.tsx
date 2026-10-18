import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

/** The one server-side generation job (ADR-0005); the generate panel is its only poller (ADR-0023). */
export const JOB_QUERY_KEY = ["generation-job"] as const;

/** On the Generate entry of the navigation bar: running / failed-and-waiting, read from the panel's cache. */
export function JobIndicator() {
  const job = useQuery({ queryKey: JOB_QUERY_KEY, queryFn: api.currentJob, enabled: false }).data?.job;
  if (job?.status === "running")
    return (
      <span className="flex items-center">
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">generation running</span>
      </span>
    );
  if (job?.status === "failed")
    return (
      <span className="flex items-center">
        <span className="size-2 rounded-full bg-destructive" aria-hidden />
        <span className="sr-only">generation failed — see Generate</span>
      </span>
    );
  return null;
}
