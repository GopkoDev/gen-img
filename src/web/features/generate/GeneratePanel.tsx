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
  checkAgainstModel,
  checkInputFile,
  type FieldErrors,
  type Job,
  MAX_INPUT_BYTES,
  MAX_INPUT_IMAGES,
  StartGenerationRequest,
} from "../../../shared/generations";
import type { ImageModel } from "../../../shared/providers";
import { type Attachment, InputImages } from "./InputImages";

const PROVIDER = "openrouter" as const;
const JOB_QUERY_KEY = ["generation-job"] as const;
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
  const provider = providers.data?.providers.find((p) => p.id === PROVIDER);
  const models = useQuery({
    queryKey: ["models", PROVIDER],
    queryFn: () => api.models(PROVIDER),
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

  // Thumbnails use object URLs; release the remaining ones when the panel goes away.
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;
  useEffect(
    () => () => {
      for (const a of attachmentsRef.current) URL.revokeObjectURL(a.url);
    },
    [],
  );

  async function addFiles(files: File[]) {
    const accepted: Attachment[] = [];
    const reasons: string[] = [];
    for (const file of files) {
      // Refuse oversized files before reading them — a dropped multi-GB video must not be loaded into memory.
      const checked =
        file.size > MAX_INPUT_BYTES
          ? ({ ok: false, message: `${file.name} — larger than 10 MB` } as const)
          : checkInputFile(new Uint8Array(await file.arrayBuffer()), file.name);
      if (checked.ok) accepted.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
      else reasons.push(checked.message);
    }
    setRefused(reasons);
    setAttachments((prev) => [...prev, ...accepted]);
    setErrors(({ inputs: _drop, ...rest }) => rest);
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
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
  useEffect(() => {
    if (!modelId && models.data?.models[0]) setModelId(models.data.models[0].id);
  }, [modelId, models.data]);

  // When a generation finishes, the gallery has a new item.
  const lastStatus = useRef<Job["status"] | undefined>(undefined);
  useEffect(() => {
    if (lastStatus.current === "running" && job?.status === "succeeded")
      qc.invalidateQueries({ queryKey: GALLERY_QUERY_KEY });
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
      if (err instanceof ApiError && err.code === "VALIDATION_ERROR" && err.details?.fields)
        setErrors(err.details.fields as FieldErrors);
      else if (err instanceof ApiError && err.code === "GENERATION_IN_PROGRESS")
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

  function selectModel(id: string) {
    setModelId(id);
    setAspectRatio(DEFAULT_ASPECT);
    setSeed("");
    setN("1");
    setErrors({});
    setRefused([]);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setRequestError(null);
    const body = {
      provider: PROVIDER,
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
    start.mutate({ body: parsed.data, files: attachments.map((a) => a.file) });
  }

  let body: ReactNode;
  if (providers.isPending) body = <p className="text-muted-foreground text-sm">Loading…</p>;
  else if (providers.isError) body = <Notice title="Couldn't reach the gen-img server" />;
  else if (!provider?.configured)
    body = (
      <div className="flex flex-col gap-2 text-sm">
        <p className="font-medium">OpenRouter is not configured.</p>
        <p className="text-muted-foreground">
          Add <code>OPENROUTER_API_KEY</code> to <code>.env.local</code> and restart gen-img. Your gallery is still
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
        <p className="text-muted-foreground text-sm">Provider: {provider.name}</p>
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
      <CardContent>{body}</CardContent>
    </Card>
  );
}
