import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import { formatCost, formatDateTime, formatDuration } from "@/lib/format";
import { Link } from "@/lib/router";
import type { Generation, RequestedParams } from "../../../shared/generations";
import { DeleteGeneration } from "./DeleteGeneration";
import { Notes } from "./Notes";

const PROVIDER_NAMES: Record<string, string> = { openrouter: "OpenRouter", vercel: "Vercel AI Gateway" };

/** A pending cost is re-read this often until it resolves (spec §6, sad §8). */
const PENDING_REFETCH_MS = 5_000;

function describeRequested(p: RequestedParams): string {
  const parts: string[] = [];
  if (p.aspectRatio) parts.push(`aspect ratio ${p.aspectRatio}`);
  if (p.seed !== undefined) parts.push(`seed ${p.seed}`);
  parts.push(`${p.n} image${p.n === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

function Raw({ title, value }: { title: string; value: unknown }) {
  return (
    <details className="rounded-md border">
      <summary className="cursor-pointer px-3 py-2 text-sm">{title}</summary>
      <pre className="max-h-96 overflow-auto border-t bg-muted p-3 text-xs">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

function Inputs({ g }: { g: Generation }) {
  if (g.inputs.length === 0) return null;
  return (
    <section aria-labelledby="inputs-title" className="flex flex-col gap-2">
      <h2 id="inputs-title" className="font-semibold text-sm">
        Inputs
      </h2>
      <div className="flex gap-3 overflow-x-auto">
        {g.inputs.map((img) => (
          <a
            key={img.position}
            href={img.url}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 flex-col gap-1"
          >
            <img
              src={img.url}
              alt={`Input ${img.position}${img.originalName ? `: ${img.originalName}` : ""}`}
              className="h-32 rounded-md border object-contain"
            />
            <span className="text-muted-foreground text-xs">
              {img.originalName ?? `input ${img.position}`} · {img.width}×{img.height}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

function Detail({ g }: { g: Generation }) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <DeleteGeneration g={g} onFailed={setDeleteError} />
      </div>
      {deleteError && (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <p className="font-medium">Couldn't delete this generation</p>
          <p>{deleteError}</p>
        </div>
      )}
      <Inputs g={g} />
      <div className="flex gap-4 overflow-x-auto">
        {g.images.map((img) => (
          <a key={img.position} href={img.url} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={img.url}
              alt={`Output ${img.position} of: ${g.prompt}`}
              className="max-h-[60vh] rounded-lg border object-contain"
            />
          </a>
        ))}
      </div>
      <Notes g={g} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
              <Row label="Provider">{PROVIDER_NAMES[g.provider] ?? g.provider}</Row>
              <Row label="Model">{g.model}</Row>
              <Row label="Prompt">
                <span className="select-text whitespace-pre-wrap">{g.prompt}</span>
              </Row>
              <Row label="Created">{formatDateTime(g.createdAt)}</Row>
              <Row label="Duration">{formatDuration(g.durationMs)}</Row>
              <Row label="Cost">
                <span className="flex items-center gap-2">
                  {formatCost(g.costMicros, g.costStatus)}
                  <Badge variant={g.costStatus === "known" ? "secondary" : "outline"}>{g.costStatus}</Badge>
                  {g.costStatus === "pending" && (
                    <span className="text-muted-foreground text-xs">updates automatically</span>
                  )}
                </span>
              </Row>
            </dl>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Parameters</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 text-sm">
              <Row label="Requested">{describeRequested(g.requestedParams)}</Row>
              <Row label="Received">
                {g.images.length} of {g.imagesRequested} image{g.imagesRequested === 1 ? "" : "s"} ·{" "}
                {g.images.map((i) => `${i.width}×${i.height}`).join(", ")}
              </Row>
              <Row label="Accepted">{g.acceptedParams ? JSON.stringify(g.acceptedParams) : "not reported"}</Row>
            </dl>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Raw exchange (redacted)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Raw title="Request" value={g.rawRequest} />
          <Raw title="Response" value={g.rawResponse} />
        </CardContent>
      </Card>
    </div>
  );
}

/** SCR-03 — one generation with all its stored metadata. */
export function GenerationDetail({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["generation", id],
    queryFn: () => api.generation(id),
    refetchInterval: (query) => (query.state.data?.costStatus === "pending" ? PENDING_REFETCH_MS : false),
  });
  const back = (
    <Button variant="link" asChild className="px-0">
      <Link to="/">
        <ArrowLeft /> Gallery
      </Link>
    </Button>
  );

  let body: ReactNode;
  if (q.isPending) body = <p className="text-muted-foreground text-sm">Loading…</p>;
  else if (q.isError && q.error instanceof ApiError && q.error.status === 404)
    body = <p>This generation no longer exists.</p>;
  else if (q.isError)
    body = (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
        <p className="text-sm">Couldn't load this generation</p>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          Retry
        </Button>
      </div>
    );
  else body = <Detail g={q.data} />;

  return (
    <div className="flex flex-col gap-4">
      {back}
      {body}
    </div>
  );
}
