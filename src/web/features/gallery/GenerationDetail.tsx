import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, RotateCcw } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api";
import { formatCost, formatDateTime, formatDuration } from "@/lib/format";
import { Link, navigate, replace } from "@/lib/router";
import { type Generation, MAX_INPUT_BYTES, type RequestedParams } from "../../../shared/generations";
import { DeleteGeneration } from "./DeleteGeneration";
import { Lineage } from "./Lineage";
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

/** «Use as input» for one output: refused in place when it can't be an input (spec AC-09), else open the panel. */
function UseAsInput({
  g,
  position,
  byteSize,
  inDialog = false,
}: {
  g: Generation;
  position: number;
  byteSize: number;
  inDialog?: boolean;
}) {
  const [refused, setRefused] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (byteSize > MAX_INPUT_BYTES) return setRefused("Can't be used as an input: larger than 10 MB");
          const to = `/?reuse=${encodeURIComponent(g.id)}&output=${position}`;
          if (inDialog)
            replace(to); // the dialog's entry becomes the generate address, so Back lands on the grid
          else navigate(to);
        }}
      >
        <ImagePlus /> Use as input
      </Button>
      {refused && <p className="text-destructive text-xs">{refused}</p>}
    </div>
  );
}

/** The dialog's left column: the first output large, the others as smaller choices that make themselves large (SCR-09). */
function OutputPicker({ g }: { g: Generation }) {
  const [selected, setSelected] = useState(0);
  const img = g.images[selected] ?? g.images[0];
  if (!img) return null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {/* The area is sized from the stored dimensions before the file loads, so nothing jumps. */}
        <a href={img.url} target="_blank" rel="noreferrer" className="block max-h-[60vh] overflow-hidden rounded-lg">
          <img
            src={img.url}
            alt={`Output ${img.position} of: ${g.prompt}`}
            width={img.width}
            height={img.height}
            style={{ aspectRatio: `${img.width} / ${img.height}` }}
            className="mx-auto max-h-[60vh] w-auto max-w-full rounded-lg border bg-muted object-contain"
          />
        </a>
        <UseAsInput g={g} position={img.position} byteSize={img.byteSize} inDialog />
      </div>
      {g.images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {g.images.map((o, i) => (
            <Button
              key={o.position}
              type="button"
              variant="outline"
              className={`h-16 w-16 p-0 ${i === selected ? "ring-2 ring-ring" : ""}`}
              aria-label={`Show output ${o.position}`}
              aria-pressed={i === selected}
              onClick={() => setSelected(i)}
            >
              <img src={o.url} alt="" className="h-full w-full rounded-md object-cover" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/** `page` is the full page (SCR-03); `dialog` splits it into the images and the metadata columns (SCR-09). */
export function Detail({ g, layout = "page" }: { g: Generation; layout?: "page" | "dialog" }) {
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const actions = (
    <div className="flex justify-end gap-2">
      <Button variant="outline" asChild>
        <Link
          to={`/?rerun=${encodeURIComponent(g.id)}`}
          onClick={
            layout === "dialog"
              ? (e) => {
                  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                  e.preventDefault();
                  replace(`/?rerun=${encodeURIComponent(g.id)}`);
                }
              : undefined
          }
        >
          <RotateCcw /> Re-run
        </Link>
      </Button>
      <DeleteGeneration g={g} onFailed={setDeleteError} />
    </div>
  );
  const deleteAlert = deleteError && (
    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
      <p className="font-medium">Couldn't delete this generation</p>
      <p>{deleteError}</p>
    </div>
  );
  const cards = (
    <>
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
    </>
  );
  if (layout === "dialog")
    return (
      <div className="grid gap-6 lg:h-full lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 lg:overflow-y-auto">
          <OutputPicker g={g} />
        </div>
        <div className="flex min-w-0 flex-col gap-6 lg:overflow-y-auto">
          {actions}
          {deleteAlert}
          <Inputs g={g} />
          <Lineage g={g} inDialog />
          <Notes g={g} />
          {cards}
        </div>
      </div>
    );
  return (
    <div className="flex flex-col gap-6">
      {actions}
      {deleteAlert}
      <Inputs g={g} />
      <div className="flex gap-4 overflow-x-auto">
        {g.images.map((img) => (
          <div key={img.position} className="flex shrink-0 flex-col gap-1">
            <a href={img.url} target="_blank" rel="noreferrer">
              <img
                src={img.url}
                alt={`Output ${img.position} of: ${g.prompt}`}
                className="max-h-[60vh] rounded-lg border object-contain"
              />
            </a>
            <UseAsInput g={g} position={img.position} byteSize={img.byteSize} />
          </div>
        ))}
      </div>
      <Lineage g={g} />
      <Notes g={g} />
      {cards}
    </div>
  );
}

/** One generation's detail read; shared by the page and the dialog (same cache entry, one request). */
export function useGeneration(id: string) {
  return useQuery({
    queryKey: ["generation", id],
    queryFn: () => api.generation(id),
    // Like the gallery (spec §6): revisiting doesn't reload; changes invalidate it, focus catches other tabs.
    staleTime: Number.POSITIVE_INFINITY,
    refetchOnWindowFocus: "always",
    refetchInterval: (query) => (query.state.data?.costStatus === "pending" ? PENDING_REFETCH_MS : false),
  });
}

/** SCR-03 — one generation with all its stored metadata. */
export function GenerationDetail({ id }: { id: string }) {
  const q = useGeneration(id);
  const back = (
    <Button variant="link" asChild className="px-0">
      <Link to="/gallery">
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
