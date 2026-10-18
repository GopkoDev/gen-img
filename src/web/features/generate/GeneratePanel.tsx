import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GALLERY_QUERY_KEY } from "@/features/gallery/Gallery";
import { ApiError, api } from "@/lib/api";
import { Link } from "@/lib/router";
import {
  carryParams,
  checkAgainstModel,
  checkInputFile,
  type FieldErrors,
  type Generation,
  type InputSlot,
  type Job,
  MAX_INPUT_BYTES,
  MAX_INPUT_IMAGES,
  type RequestedParams,
  type SourceRef,
  StartGenerationRequest,
} from "../../../shared/generations";
import type { ImageModel, ProviderId } from "../../../shared/providers";
import { type Attachment, InputImages } from "./InputImages";
import { EstimateLine, PriceLine } from "./PricePreview";

/** The env var that configures each provider's key — shown when a provider isn't configured. */
const KEY_VARS: Record<ProviderId, string> = { openrouter: "OPENROUTER_API_KEY", vercel: "AI_GATEWAY_API_KEY" };
const PROVIDER_STORAGE = "gen-img:provider";

function rememberedProvider(): ProviderId | null {
  try {
    const v = sessionStorage.getItem(PROVIDER_STORAGE);
    return v === "openrouter" || v === "vercel" ? v : null;
  } catch {
    return null;
  }
}
const JOB_QUERY_KEY = ["generation-job"] as const;

/** The draft's source (ADR-0019): what «Started from …» shows and the lineage the request carries. */
type DraftSource = SourceRef & { prompt: string };
type PendingSource = { relation: "rerun" | "reuse"; model?: string };

/** `/?rerun=<id>` or `/?reuse=<id>&output=<n>` — read once when the panel mounts. */
function sourceFromAddress(): { id: string; relation: "rerun" | "reuse"; output?: number } | null {
  const q = new URLSearchParams(window.location.search);
  const rerun = q.get("rerun");
  if (rerun) return { id: rerun, relation: "rerun" };
  const reuse = q.get("reuse");
  const output = Number(q.get("output"));
  if (reuse && Number.isInteger(output) && output >= 1) return { id: reuse, relation: "reuse", output };
  return null;
}

const excerpt = (s: string) => (s.length > 40 ? `${s.slice(0, 40)}…` : s);
const DEFAULT_ASPECT = "__default__";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium text-sm">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function Notice({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
    >
      <p className="font-medium">{title}</p>
      {children}
      {action && <div className="self-end">{action}</div>}
    </div>
  );
}

function LatestResult({ generationId }: { generationId: string }) {
  const q = useQuery({ queryKey: ["generation", generationId], queryFn: () => api.generation(generationId) });
  // Deleted meanwhile (curate-gallery AC-12): never show a broken result.
  if (q.error instanceof ApiError && q.error.code === "NOT_FOUND") return null;
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>Saved to gallery</span>
        <Link to={`/generations/${generationId}`} className="underline underline-offset-4">
          Open
        </Link>
      </div>
      {q.data && (
        <div className="flex gap-2 overflow-x-auto">
          {q.data.images.map((img) => (
            <Link
              key={img.position}
              to={`/generations/${generationId}`}
              className="shrink-0"
              aria-label={`Open output ${img.position}`}
            >
              <img src={img.url} alt="" className="h-20 w-20 rounded-md border object-cover" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** SCR-01 — pick a model, write a prompt, set supported parameters, generate. */
export function GeneratePanel() {
  const qc = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: api.providers });
  // The Owner's choice (remembered for the browser session), else the first configured provider (OpenRouter first).
  const [chosen, setChosen] = useState<ProviderId | null>(rememberedProvider);
  const list = providers.data?.providers ?? [];
  const providerId: ProviderId = chosen ?? list.find((p) => p.configured)?.id ?? "openrouter";
  const provider = list.find((p) => p.id === providerId);
  const models = useQuery({
    queryKey: ["models", providerId],
    queryFn: () => api.models(providerId),
    enabled: provider?.configured === true,
  });
  const jobQ = useQuery({
    queryKey: JOB_QUERY_KEY,
    queryFn: api.currentJob,
    refetchOnWindowFocus: true,
    refetchInterval: (q) => (q.state.data?.job?.status === "running" ? 1000 : false),
  });
  const job: Job | null = jobQ.data?.job ?? null;
  const running = job?.status === "running";

  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT);
  const [seed, setSeed] = useState("");
  const [n, setN] = useState("1");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState<string | null>(null);
  const [dismissError, setDismissError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [refused, setRefused] = useState<string[]>([]);
  const [draftSource, setDraftSource] = useState<DraftSource | null>(null);
  const [sourceGone, setSourceGone] = useState(false);
  const [loadingSource, setLoadingSource] = useState(false);
  const [pending, setPending] = useState<PendingSource | null>(null);
  const [modelNotice, setModelNotice] = useState<string | null>(null);
  const [removedNote, setRemovedNote] = useState<string | null>(null);
  const [carryOnLoad, setCarryOnLoad] = useState(false);

  // Thumbnails use object URLs; release the remaining ones when the panel goes away.
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(
    () => () => {
      for (const a of attachmentsRef.current) if (a.file) URL.revokeObjectURL(a.url);
    },
    [],
  );

  function replaceAttachments(next: Attachment[]) {
    for (const a of attachmentsRef.current) if (a.file) URL.revokeObjectURL(a.url);
    setAttachments(next);
  }

  /** Re-run: same provider, model, prompt, parameters and stored inputs; reuse: one output, empty prompt (ADR-0019). */
  function applySource(g: Generation, relation: "rerun" | "reuse", output?: number) {
    setSourceGone(false);
    setModelNotice(null);
    setRemovedNote(null);
    setErrors({});
    setRefused([]);
    if (relation === "rerun") {
      setChosen(g.provider);
      setModelId(g.model);
      setPrompt(g.prompt);
      setAspectRatio(g.requestedParams.aspectRatio ?? DEFAULT_ASPECT);
      setSeed(g.requestedParams.seed === undefined ? "" : String(g.requestedParams.seed));
      setN(String(g.requestedParams.n));
      replaceAttachments(
        g.inputs.map((i) => ({
          id: crypto.randomUUID(),
          url: i.url,
          name: i.originalName ?? `input-${i.position}`,
          stored: { generationId: g.id, kind: "input", position: i.position },
        })),
      );
      setDraftSource({ id: g.id, relation, prompt: g.prompt });
      setPending({ relation, model: g.model });
      return;
    }
    const img = g.images.find((i) => i.position === output);
    if (!img || output === undefined) return setSourceGone(true);
    setPrompt("");
    setAspectRatio(DEFAULT_ASPECT);
    setSeed("");
    setN("1");
    replaceAttachments([
      {
        id: crypto.randomUUID(),
        url: img.url,
        name: `output-${img.position}`,
        stored: { generationId: g.id, kind: "output", position: img.position },
      },
    ]);
    setDraftSource({ id: g.id, relation, output, prompt: g.prompt });
    setPending({ relation });
  }

  // Apply a re-run / reuse source carried in the address once, then clean the address (ADR-0019).
  const qcRef = useRef(qc);
  qcRef.current = qc;
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once on mount; applySource reads the latest state
  useEffect(() => {
    const src = sourceFromAddress();
    if (!src) return;
    setLoadingSource(true);
    qcRef.current
      .fetchQuery({ queryKey: ["generation", src.id], queryFn: () => api.generation(src.id) })
      .then((g) => applySource(g, src.relation, src.output))
      .catch(() => setSourceGone(true))
      .finally(() => {
        setLoadingSource(false);
        window.history.replaceState(null, "", "/");
      });
  }, []);

  async function addFiles(files: File[]) {
    const accepted: Attachment[] = [];
    const reasons: string[] = [];
    for (const file of files) {
      // Refuse oversized files before reading them — a dropped multi-GB video must not be loaded into memory.
      const checked =
        file.size > MAX_INPUT_BYTES
          ? ({ ok: false, message: `${file.name} — larger than 10 MB` } as const)
          : checkInputFile(new Uint8Array(await file.arrayBuffer()), file.name);
      if (checked.ok) accepted.push({ id: crypto.randomUUID(), file, name: file.name, url: URL.createObjectURL(file) });
      else reasons.push(checked.message);
    }
    setRefused(reasons);
    setAttachments((prev) => [...prev, ...accepted]);
    setErrors(({ inputs: _drop, ...rest }) => rest);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone?.file) URL.revokeObjectURL(gone.url);
      return prev.filter((a) => a.id !== id);
    });
  }

  // A dismiss error is about the notice it failed on — drop it once the job changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset is keyed on the job identity, not read from it
  useEffect(() => setDismissError(null), [job?.id, job?.status]);

  // Re-render every second while a generation runs, so «Started N s ago» counts up between polls.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const model: ImageModel | undefined = models.data?.models.find((x) => x.id === modelId);
  // biome-ignore lint/correctness/useExhaustiveDependencies: carries over only when a new list arrives, not on each keystroke
  useEffect(() => {
    if (pending) return; // a draft source decides the model once the list is in
    const first = models.data?.models[0];
    if (!modelId && first) {
      setModelId(first.id);
      if (carryOnLoad) {
        setCarryOnLoad(false);
        carryTo(first);
      }
    }
  }, [modelId, models.data, pending]);

  // Once the model list of the draft's provider is in, check the source's model (AC-10) or find one that takes inputs (AC-11).
  // biome-ignore lint/correctness/useExhaustiveDependencies: settles the pending source once per model list
  useEffect(() => {
    const list = models.data?.models;
    if (!pending || !list) return;
    setPending(null);
    if (pending.relation === "rerun") {
      if (pending.model && !list.some((x) => x.id === pending.model)) {
        setModelNotice(
          `The original model ${pending.model} isn't available — choose another. The prompt, parameters and images are kept.`,
        );
        // Same rule as a manual switch: carry supported parameters over, name what was dropped (AC-05, AC-10).
        const fallback = list[0];
        if (fallback) {
          setModelId(fallback.id);
          carryTo(fallback);
        }
      }
      setCarryOnLoad(false); // the draft settled the model; a later list load must not re-carry
      return;
    }
    const current = list.find((x) => x.id === modelId) ?? list[0];
    if (current?.params.inputs) return setModelId(current.id);
    const withInputs = list.find((x) => x.params.inputs);
    if (withInputs) {
      setModelId(withInputs.id);
      setModelNotice(`Switched to ${withInputs.name} — it takes input images.`);
    } else {
      if (current) setModelId(current.id);
      setModelNotice(`No ${provider?.name ?? "provider"} model takes input images — switch provider.`);
    }
  }, [models.data, pending]);

  // When a generation finishes, the gallery has a new item.
  const lastStatus = useRef<Job["status"] | undefined>(undefined);
  useEffect(() => {
    if (lastStatus.current === "running" && job?.status === "succeeded") {
      qc.invalidateQueries({ queryKey: GALLERY_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["cost-history"] }); // a new known cost refines per-token estimates
    }
    lastStatus.current = job?.status;
  }, [job?.status, qc]);

  const start = useMutation({
    mutationFn: ({ body, files }: { body: StartGenerationRequest; files: File[] }) =>
      files.length ? api.startGeneration(body, files) : api.startGeneration(body),
    onSuccess: (res) => {
      qc.setQueryData(JOB_QUERY_KEY, { job: res.job });
      qc.invalidateQueries({ queryKey: JOB_QUERY_KEY });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details?.fields) {
        const fields = err.details.fields as FieldErrors;
        const GONE = "The source generation no longer exists";
        if (fields.source === GONE) setSourceGone(true); // only a lineage claim makes the «source» notice
        // Stored images whose generation is gone can't be sent any more: find their generations from the
        // failing positions (the link may already be removed), take them off the draft and say so (sad §11).
        const goneIds = new Set(
          Object.entries(fields)
            .filter(([k, v]) => k.startsWith("inputs.") && v === GONE)
            .map(([k]) => attachments[Number(k.slice("inputs.".length)) - 1]?.stored?.generationId)
            .filter((id): id is string => id !== undefined),
        );
        if (fields.source === GONE && draftSource) goneIds.add(draftSource.id);
        if (goneIds.size) {
          setAttachments(attachments.filter((a) => !a.stored || !goneIds.has(a.stored.generationId)));
          setRemovedNote("Images from a deleted generation were removed.");
        }
        setErrors(
          Object.fromEntries(Object.entries(fields).filter(([k, v]) => !(k.startsWith("inputs.") && v === GONE))),
        );
      } else if (err instanceof ApiError && err.code === "GENERATION_IN_PROGRESS")
        qc.invalidateQueries({ queryKey: JOB_QUERY_KEY });
      else setRequestError(err instanceof Error ? err.message : String(err));
    },
  });
  const dismiss = useMutation({
    mutationFn: () => api.dismissJob(),
    onMutate: () => setDismissError(null),
    onSuccess: () => qc.setQueryData(JOB_QUERY_KEY, { job: null }),
    onError: (err) => {
      setDismissError(err instanceof Error ? err.message : String(err));
      qc.invalidateQueries({ queryKey: JOB_QUERY_KEY });
    },
  });

  function selectProvider(id: string) {
    if (id !== "openrouter" && id !== "vercel") return;
    setChosen(id);
    try {
      sessionStorage.setItem(PROVIDER_STORAGE, id);
    } catch {}
    selectModel(""); // the first model of the new list is preselected; prompt and attachments are kept
  }

  /** Model switch (SAD §4 choice 4): keep what the new model supports, remove and name the rest. */
  function carryTo(next: ImageModel) {
    const current: RequestedParams = {
      n: Math.max(1, Number(n) || 1),
      ...(aspectRatio !== DEFAULT_ASPECT ? { aspectRatio } : {}),
      ...(seed.trim() !== "" && Number.isInteger(Number(seed)) ? { seed: Number(seed) } : {}),
    };
    const { params, removed } = carryParams(current, next);
    setAspectRatio(params.aspectRatio ?? DEFAULT_ASPECT);
    setSeed(params.seed === undefined ? "" : String(params.seed));
    setN(String(params.n));
    const names = removed.filter((r) => !r.startsWith("images lowered"));
    const lowered = removed.find((r) => r.startsWith("images lowered"));
    const parts = [
      ...(names.length ? [`Not supported by this model: ${names.join(", ")}.`] : []),
      ...(lowered ? [`Images lowered to ${params.n}.`] : []),
    ];
    setRemovedNote(parts.length ? parts.join(" ") : null);
  }

  function selectModel(id: string) {
    setModelId(id);
    setErrors({});
    setRefused([]);
    const next = models.data?.models.find((x) => x.id === id);
    if (next) carryTo(next);
    else setCarryOnLoad(true); // provider switch: the new list's first model is checked once it loads
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setRequestError(null);
    const body = {
      provider: providerId,
      model: modelId,
      prompt,
      params: {
        n: Number(n),
        ...(aspectRatio !== DEFAULT_ASPECT ? { aspectRatio } : {}),
        ...(seed.trim() !== "" ? { seed: Number(seed) } : {}),
      },
    };
    const parsed = StartGenerationRequest.safeParse(body);
    const fields: FieldErrors = {};
    if (!parsed.success) for (const i of parsed.error.issues) fields[i.path.join(".")] ??= i.message;
    else if (model) Object.assign(fields, checkAgainstModel(parsed.data.params, model, attachments.length));
    setErrors(fields);
    if (Object.keys(fields).length > 0 || !parsed.success) return;
    // Stored images ride as references, uploads as upload slots, in the order shown (ADR-0017).
    const files = attachments.flatMap((a) => (a.file ? [a.file] : []));
    let upload = 0;
    const inputs: InputSlot[] | undefined = attachments.some((a) => a.stored)
      ? attachments.map((a) => (a.stored ? { stored: a.stored } : { upload: ++upload }))
      : undefined;
    const source: SourceRef | undefined = draftSource
      ? draftSource.relation === "reuse"
        ? { id: draftSource.id, relation: "reuse", output: draftSource.output }
        : { id: draftSource.id, relation: "rerun" }
      : undefined;
    start.mutate({ body: { ...parsed.data, ...(source ? { source } : {}), ...(inputs ? { inputs } : {}) }, files });
  }

  let body: ReactNode;
  if (providers.isPending) body = <p className="text-muted-foreground text-sm">Loading…</p>;
  else if (providers.isError) body = <Notice title="Couldn't reach the gen-img server" />;
  else if (!provider?.configured)
    body = (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">{provider?.name ?? "This provider"} is not configured.</p>
        <p className="text-muted-foreground">
          Add <code>{KEY_VARS[providerId]}</code> to <code>.env.local</code> and restart gen-img. Your gallery is still
          available.
        </p>
      </div>
    );
  else if (models.isError)
    body = (
      <Notice
        title="Model list unavailable"
        action={
          <Button variant="outline" size="sm" onClick={() => models.refetch()}>
            Retry
          </Button>
        }
      >
        <p>{models.error.message}</p>
      </Notice>
    );
  else {
    const disabled = running || start.isPending || models.isPending;
    const inputRange = model?.params.inputs
      ? { min: model.params.inputs.min, max: Math.min(model.params.inputs.max, MAX_INPUT_IMAGES) }
      : undefined;
    const overLimit = attachments.length > (inputRange?.max ?? 0);
    const maxN = model?.params.n?.max ?? 1;
    const invalid = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-error` } : {});
    body = (
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field id="model" label="Model" error={errors.model}>
          <Select value={modelId} onValueChange={selectModel} disabled={disabled}>
            <SelectTrigger id="model" className="w-full" {...invalid("model")}>
              {/* The closed picker shows the name only; the open list shows name + id (AC-03). */}
              <SelectValue placeholder={models.isPending ? "Loading models…" : "Choose a model"}>
                {model?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {models.data?.models.map((x) => (
                <SelectItem key={x.id} value={x.id}>
                  <span className="flex flex-col items-start">
                    <span>{x.name}</span>
                    <span className="text-muted-foreground text-xs">{x.id}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <PriceLine provider={providerId} model={modelId} />
          {removedNote && <p className="text-muted-foreground text-sm">{removedNote}</p>}
        </Field>
        <Field id="prompt" label="Prompt" error={errors.prompt}>
          <Textarea
            id="prompt"
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={disabled}
            {...invalid("prompt")}
          />
        </Field>
        {(inputRange || attachments.length > 0) && (
          <InputImages
            attachments={attachments}
            range={inputRange}
            refused={refused}
            error={
              errors.inputs ??
              (Object.entries(errors)
                .filter(([k]) => k.startsWith("inputs."))
                .map(([, v]) => v)
                .join("; ") ||
                undefined)
            }
            disabled={disabled}
            onAdd={addFiles}
            onRemove={removeAttachment}
          />
        )}
        {model?.params.aspectRatio && (
          <Field id="params.aspectRatio" label="Aspect ratio" error={errors["params.aspectRatio"]}>
            <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={disabled}>
              <SelectTrigger id="params.aspectRatio" className="w-full" {...invalid("params.aspectRatio")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_ASPECT}>Model default</SelectItem>
                {model.params.aspectRatio.values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {model?.params.seed && (
          <Field id="params.seed" label="Seed" error={errors["params.seed"]}>
            <Input
              id="params.seed"
              type="number"
              inputMode="numeric"
              placeholder="random"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              disabled={disabled}
              {...invalid("params.seed")}
            />
          </Field>
        )}
        <Field id="params.n" label="Images" error={errors["params.n"]}>
          <Input
            id="params.n"
            type="number"
            min={1}
            max={maxN}
            value={n}
            onChange={(e) => setN(e.target.value)}
            disabled={disabled}
            {...invalid("params.n")}
          />
        </Field>

        {job?.status === "failed" && (
          <Notice
            title="Generation failed"
            action={
              <Button variant="ghost" size="sm" onClick={() => dismiss.mutate()} disabled={dismiss.isPending}>
                Dismiss
              </Button>
            }
          >
            <p>{job.error?.message}</p>
          </Notice>
        )}
        {dismissError && (
          <Notice title="Couldn't dismiss the notice">
            <p>{dismissError}</p>
          </Notice>
        )}
        {requestError && <Notice title="Couldn't start the generation">{requestError}</Notice>}

        <EstimateLine
          provider={providerId}
          model={modelId}
          images={Math.max(1, Number(n) || 1)}
          inputs={attachments.length}
        />
        <Button type="submit" disabled={disabled || overLimit}>
          {running || start.isPending ? (
            <>
              <Loader2 className="animate-spin" /> Generating…
            </>
          ) : (
            "Generate"
          )}
        </Button>
        {running && job && (
          <p className="text-muted-foreground text-sm">
            Started {Math.max(0, Math.round((now - Date.parse(job.startedAt)) / 1000))} s ago
          </p>
        )}
        {job?.status === "succeeded" && job.generationId && <LatestResult generationId={job.generationId} />}
      </form>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {list.length > 0 && (
          <Field id="provider" label="Provider">
            <Select value={providerId} onValueChange={selectProvider} disabled={running || start.isPending}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue>{provider?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {list.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.configured ? p.name : `${p.name} — not configured`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {loadingSource && <p className="text-muted-foreground text-sm">Loading the source generation…</p>}
        {draftSource && (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">
                Started from:{" "}
                <Link to={`/generations/${draftSource.id}`} className="underline underline-offset-4">
                  {draftSource.relation === "rerun"
                    ? `Re-run of «${excerpt(draftSource.prompt)}»`
                    : `Made from output ${draftSource.output} of «${excerpt(draftSource.prompt)}»`}
                </Link>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Remove the link to the source"
                onClick={() => setDraftSource(null)}
              >
                ×
              </Button>
            </div>
            {draftSource.relation === "rerun" && (
              <p className="text-muted-foreground">Sends the same inputs again — results can differ.</p>
            )}
          </div>
        )}
        {sourceGone && (
          <Notice
            title="The source generation no longer exists."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSourceGone(false);
                  setDraftSource(null);
                  setErrors(({ source: _drop, ...rest }) => rest);
                }}
              >
                Remove the link
              </Button>
            }
          />
        )}
        {modelNotice && <Notice title={modelNotice} />}
        {body}
      </CardContent>
    </Card>
  );
}
