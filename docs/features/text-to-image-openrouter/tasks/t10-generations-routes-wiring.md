---
id: T10
title: "Expose generations, job and file routes and wire the app"
layer: "ports"
deps: ["T7", "T8", "T9"]
blocks: ["T11", "T15"]
acs: ["AC-01", "AC-02", "AC-04", "AC-05", "AC-12", "AC-15", "AC-17", "AC-18"]
files_hint: ["src/server/modules/generations/routes.ts", "src/server/modules/generations/routes.int.test.ts", "src/shared/generations.ts", "src/server/app.ts", "src/server/index.ts", "tests/helpers/test-app.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

# T10 — Expose generations, job and file routes and wire the app

## Place in the sequence

- **Blocked by:** T7 — Run generations as a single-slot job and save results atomically, T8 — Guard every API request by Host, Origin and Fetch Metadata, T9 — Expose providers and the cached model catalog · **Blocks:** T11 — Add the typed web API client and the two-route router, T15 — Verify the performance and durability NFRs.
- **Lane:** shares `src/server/app.ts` with T8 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to pick an OpenRouter image model, write a prompt, optionally set aspect ratio, seed and number of images, and generate
> **So that** I get images without leaving gen-img
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: expose generations, job and file routes and wire the app.

## Inlined context

> POST /generations → 202 {job} · GET /generation-job → {job|null} · DELETE /generation-job → 204 (409 while running) · GET /generations?cursor&limit (default 24, max 100) → {items, nextCursor} · GET /generations/{id} · GET /files/{path} — only paths recorded for a stored generation image, anything else 404
>
> — `contracts/openapi.yaml, paths, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

> **Wiring:** dependencies (db, config, later file store / provider registry / clock) are passed into `createApp(deps)` explicitly — no global singletons. Tests build the app with fakes.
>
> — `CLAUDE.md §Conventions, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.*` (id, provider, model, prompt, requested_params, accepted_params, images_requested, cost_micros, cost_status, created_at, duration_ms, raw_request, raw_response) | TEXT/INTEGER | PK id; CHECK prompt non-blank; cost_status IN known/pending/unavailable; known ⇔ cost_micros NOT NULL | read (via service) |
| `generation_images.*` (generation_id, position, path, media_type, width, height, byte_size) | TEXT/INTEGER | PK (generation_id, position); FK → generations ON DELETE CASCADE; media_type IN png/jpeg/webp/gif | read (via service) |

— `data-model.md §Entities, generations + generation_images, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `startGeneration` 202 `JobResponse` · 400 VALIDATION_ERROR · 404 unknown provider · 409 GENERATION_IN_PROGRESS / PROVIDER_NOT_CONFIGURED.
- `listGenerations` 200 `GenerationPage` · `getGeneration` 200 `Generation` / 404 · `getCurrentJob` 200 `{job|null}` · `dismissJob` 204 / 409 · `getFile` 200 image / 404.

— `contracts/openapi.yaml, operations, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner has configured an OpenRouter key and opened the generate form
> **When** the Owner selects an image model, enters a non-empty prompt and generates
> **Then** the system shows a «generating» state, then the resulting output images, and the new generation appears at the top of the gallery
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-02 — happy path

> **Given** a generation has just succeeded
> **When** the Owner opens its detail view
> **Then** the Owner sees the output images, provider, image model, prompt, the parameters the Owner set, created-at (the moment the Owner submitted; the gallery orders by it), duration (from sending the request to the provider until its answer arrived), the cost with its cost status, and the raw request and response the provider exchanged
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-04 — happy path

> **Given** the Owner has many saved generations
> **When** the Owner opens the gallery
> **Then** the system shows thumbnails newest first with prompt excerpt, model and created-at, and loads older generations on demand rather than all at once
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-05 — error

> **Given** the Owner is on the generate form
> **When** the Owner tries to generate with an empty or whitespace-only prompt, no model selected, or a number of images outside 1–4 (or above what the model supports)
> **Then** the system does not send anything to the provider and tells the Owner which field must be fixed and how
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — authorization

> **Given** the Owner (or a crafted link) asks the app for an image file
> **When** the requested file is not an image stored under the app's own data folder
> **Then** the system does not reveal it or whether it exists — only stored generation images are ever served
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — happy path

> **Given** the Owner has no saved generations yet
> **When** the Owner opens the gallery
> **Then** the system shows an empty state that points to the generate form
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

### AC-17 — happy path

> **Given** a generation is in progress
> **When** the Owner closes or reloads the page before it finishes
> **Then** the generation still completes and appears in the gallery; only one generation can be in progress in gen-img at a time — any open or reloaded generate form shows «in progress» and cannot submit another until it ends, so one click never spends twice; if that generation fails or cannot be stored while no page is watching, the reason is shown the next time the Owner opens the generate form, until the Owner dismisses it
>
> — `spec.md §5, AC-17, verbatim` · full text: [spec.md](../spec.md)

### AC-18 — cross-context

> **Given** a generation was made through a provider
> **When** the Owner looks at it in the gallery or the detail view
> **Then** the provider that produced it is always shown next to the image model, so generations from a second provider added later sit in the same gallery without ambiguity
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] zod response schemas `Job`, `GenerationSummary`, `GenerationPage`, `Generation`, `OutputImage` in `src/shared/generations.ts`
- [ ] `registerGenerationsRoutes(app, deps)`: POST/GET `/generations`, GET `/generations/:id`, GET+DELETE `/generation-job`, GET `/files/*` (lookup via `repo.isRecordedPath`, content-type from the row)
- [ ] Extend `AppDeps` with `providers`, `fetch?`, `now?`, `generationTimeoutMs?`; build registry, file store, repo, service in `createApp`; run `service.sweepOnBoot()`; register providers + generations routes
- [ ] `tests/helpers/test-app.ts`: accept a fake `fetch` / provider registry override

## Edge cases

| Case | Behaviour |
|---|---|
| limit=0 or 101 / malformed cursor | 400 VALIDATION_ERROR |
| file path `generations/../gen-img.db` | 404 |
| detail for an id with no row | 404 NOT_FOUND |

## Definition of Done

- [ ] integration tests via app.request() with a fixture-backed provider: start 202 → job polling → detail with all fields; validation 400 with details.fields; 409 in progress; list paging + empty; detail 404; file 200 for recorded path, 404 for unrecorded / traversal; boot sweep runs on createApp
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
