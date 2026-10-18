---
id: T6
title: "Write the generations repo: atomic insert, gallery page, detail, recorded path lookup"
layer: "infra"
deps: ["T1", "T2"]
blocks: ["T7"]
acs: ["AC-02", "AC-04", "AC-07", "AC-16", "AC-18"]
files_hint: ["src/server/modules/generations/repo.ts", "src/server/modules/generations/repo.int.test.ts", "tests/helpers/generations.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T6 — Write the generations repo: atomic insert, gallery page, detail, recorded path lookup

## Place in the sequence

- **Blocked by:** T1 — Promote the generations migration into the live tree, T2 — Implement generation domain rules: validation, params, cost conversion · **Blocks:** T7 — Run generations as a single-slot job and save results atomically.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** each successful generation saved on my machine with its output images and full metadata
> **So that** no prompt or result is lost and I can repeat the request later
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: write the generations repo: atomic insert, gallery page, detail, recorded path lookup.

## Inlined context

> **Access patterns:** gallery page newest first with cursor (`WHERE id < ? ORDER BY id DESC LIMIT 24`) → PK; detail by id → PK.
>
> — `data-model.md §generations, Access patterns, verbatim` · full text: [data-model.md](../data-model.md)

> **Persistence:** hand-written SQL in a per-module `repo.ts` with prepared statements; parse every row through zod before it leaves the repo.
>
> — `CLAUDE.md §Conventions, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.*` (id, provider, model, prompt, requested_params, accepted_params, images_requested, cost_micros, cost_status, created_at, duration_ms, raw_request, raw_response) | TEXT/INTEGER | PK id; CHECK prompt non-blank; cost_status IN known/pending/unavailable; known ⇔ cost_micros NOT NULL | read + write |
| `generation_images.*` (generation_id, position, path, media_type, width, height, byte_size) | TEXT/INTEGER | PK (generation_id, position); FK → generations ON DELETE CASCADE; media_type IN png/jpeg/webp/gif | read + write |

— `data-model.md §Entities, generations + generation_images, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

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

### AC-07 — domain invariant

> **Given** the provider's answer for a successful generation does not state a price
> **When** the generation is saved and the Owner opens it
> **Then** the cost status is «unavailable» and the cost is shown as «unavailable», never as zero — an unknown price is never presented as free; when the answer states a price, the status is «known» with that exact amount (this slice never marks a cost «pending»)
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-16 — domain invariant

> **Given** the Owner asked for several images
> **When** the provider returns fewer usable images than requested (but at least one)
> **Then** the system saves the generation with the images it received and the detail view states how many were requested and how many were received — a paid partial result is never thrown away
>
> — `spec.md §5, AC-16, verbatim` · full text: [spec.md](../spec.md)

### AC-18 — cross-context

> **Given** a generation was made through a provider
> **When** the Owner looks at it in the gallery or the detail view
> **Then** the provider that produced it is always shown next to the image model, so generations from a second provider added later sit in the same gallery without ambiguity
>
> — `spec.md §5, AC-18, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `createGenerationsRepo(db)` with prepared statements in `repo.ts`
- [ ] `insertAtomic(gen, images, commitFiles: () => void)` → `db.transaction(() => { insert gen; insert images; commitFiles(); })()`
- [ ] `listPage({cursor?, limit})` → summaries `WHERE id < ? ORDER BY id DESC LIMIT ?+1` with first image + images received count, `nextCursor`
- [ ] `get(id)` → full detail incl. images ordered by position; every row parsed by zod
- [ ] `isRecordedPath(path)` and `allIds()` (for the boot sweep)
- [ ] `tests/helpers/generations.ts` → `seedGeneration(db, dataDir, overrides?)` writing tiny PNGs (no PII)

## Edge cases

| Case | Behaviour |
|---|---|
| cursor not an existing id | still works — `id < cursor` lexical ULID order |
| limit > 100 | rejected by the route (T10), repo trusts input |
| commitFiles throws | no rows remain |

## Definition of Done

- [ ] integration tests: insert + read back round-trips every field through zod; page of 24 newest first with nextCursor; detail; isRecordedPath; insert inside transaction rolls back when the commit callback throws
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
