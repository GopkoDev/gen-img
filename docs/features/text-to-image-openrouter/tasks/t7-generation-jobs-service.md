---
id: T7
title: "Run generations as a single-slot job and save results atomically"
layer: "app"
deps: ["T4", "T5", "T6"]
blocks: ["T10"]
acs: ["AC-01", "AC-06", "AC-08", "AC-16", "AC-17"]
files_hint: ["src/server/modules/generations/jobs.ts", "src/server/modules/generations/service.ts", "src/server/modules/generations/service.int.test.ts", "src/server/lib/errors.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T7 — Run generations as a single-slot job and save results atomically

## Place in the sequence

- **Blocked by:** T4 — Define the ImageProvider port and build the OpenRouter adapter, T5 — Build the file store: stage, commit, discard, sweep, recorded reads, T6 — Write the generations repo: atomic insert, gallery page, detail, recorded path lookup · **Blocks:** T10 — Expose generations, job and file routes and wire the app.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each successful generation saved on my machine with its output images and full metadata
> **So that** no prompt or result is lost and I can repeat the request later
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: run generations as a single-slot job and save results atomically.

## Inlined context

> **Chosen:** Option 1 … the slot is server-side (covers reloads and second tabs) … The last failure notice is persisted to `<data dir>/last-job-failure.json` (written on failure, removed on dismiss or the next start)
>
> — `adr/0005, Decision outcome + Negative, abridged` · full text: [ADR-0005](../adr/0005-run-generations-as-a-single-slot-server-job-polled-by-the-ui.md)

> | Provider request timeout | 180 s, then the request is cancelled and the AC-06 failure path runs; nothing is recorded …
> | Durability | 0 half-saved generations after a crash/kill mid-save …
>
> — `spec.md §6, two rows, abridged` · full text: [spec.md](../spec.md)

> Gen->>Store: stage image files · Gen->>DB: insert generation + images (transaction) · Gen->>Store: move staged dir into place (inside transaction) · alt storage fails (before or after the move) → discard staging and any moved dir; job failed (storage reason, persisted notice)
>
> — `sad.md §6, Critical flow 1, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.*` (id, provider, model, prompt, requested_params, accepted_params, images_requested, cost_micros, cost_status, created_at, duration_ms, raw_request, raw_response) | TEXT/INTEGER | PK id; CHECK prompt non-blank; cost_status IN known/pending/unavailable; known ⇔ cost_micros NOT NULL | write (via repo) |
| `generation_images.*` (generation_id, position, path, media_type, width, height, byte_size) | TEXT/INTEGER | PK (generation_id, position); FK → generations ON DELETE CASCADE; media_type IN png/jpeg/webp/gif | write (via repo) |

— `data-model.md §Entities, generations + generation_images, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has configured an OpenRouter key and opened the generate form
> **When** the Owner selects an image model, enters a non-empty prompt and generates
> **Then** the system shows a «generating» state, then the resulting output images, and the new generation appears at the top of the gallery
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — error

> **Given** the Owner submits a valid request
> **When** the provider refuses or fails it (e.g. insufficient credits, content moderation, model unavailable, timeout), or answers without a single usable image (an image that decodes to a non-empty PNG, JPEG, WebP or GIF picture)
> **Then** the system shows the Owner the provider's reason in plain language, keeps the prompt and settings in the form, and saves nothing to the gallery
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** the Owner generates successfully but saving the output images on the machine fails part-way (e.g. the disk is full)
> **When** the save is attempted
> **Then** the system keeps the invariant «a generation is saved only together with all its output images»: no partial generation appears in the gallery, and the Owner is told the result could not be stored and why
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — domain invariant

> **Given** the Owner asked for several images
> **When** the provider returns fewer usable images than requested (but at least one)
> **Then** the system saves the generation with the images it received and the detail view states how many were requested and how many were received — a paid partial result is never thrown away
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

### AC-17 — happy path

> **Given** a generation is in progress
> **When** the Owner closes or reloads the page before it finishes
> **Then** the generation still completes and appears in the gallery; only one generation can be in progress in gen-img at a time — any open or reloaded generate form shows «in progress» and cannot submit another until it ends, so one click never spends twice; if that generation fails or cannot be stored while no page is watching, the reason is shown the next time the Owner opens the generate form, until the Owner dismisses it
>
> — `spec.md §5, AC-17, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Add error codes `GENERATION_IN_PROGRESS` (409), `PROVIDER_NOT_CONFIGURED` (409), `STORAGE_ERROR` (500), `FORBIDDEN` (403) to `src/server/lib/errors.ts` + `src/shared/errors.ts`
- [ ] `jobs.ts`: single slot `{id, status, startedAt, finishedAt?, generationId?, error?}`; `start(fn)` refuses when running; failure notice written to `<data>/last-job-failure.json`, loaded on construct, removed on dismiss / next start
- [ ] `service.ts` `startGeneration(req)`: validate (T2) against the cached model, mint ULID + createdAt at submit, run in background with `AbortSignal.timeout(timeoutMs=180_000)` (injectable), measure duration around `provider.generate`
- [ ] On success: `fileStore.stage` → `repo.insertAtomic(..., () => fileStore.commitSync(id))`; replace `{"$image":N}` placeholders with `{"$file": path}`; on any throw → `fileStore.discard(id)`, job failed with `STORAGE_ERROR` «The images could not be stored: <reason>»
- [ ] `getJob()`, `dismissJob()` (409 while running), `listPage`, `get` passthroughs; `sweepOnBoot()` = `fileStore.sweep(new Set(repo.allIds()))`

## Edge cases

| Case | Behaviour |
|---|---|
| page closed mid-generation | job continues; result appears in gallery |
| two tabs submit | second gets GENERATION_IN_PROGRESS, nothing sent |
| process restarts mid-generation | running job lost (accepted); no partial files after sweep |
| dismiss while running | 409 GENERATION_IN_PROGRESS |

## Definition of Done

- [ ] integration tests with a fake provider: start → running → succeeded with saved generation; second start while running → GENERATION_IN_PROGRESS; provider error / 0 images / timeout → failed with reason and nothing saved; storage failure (stage or commit) → failed, no rows, no files; partial (2 of 4) saved; failure notice persists across a new service instance until dismiss
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
