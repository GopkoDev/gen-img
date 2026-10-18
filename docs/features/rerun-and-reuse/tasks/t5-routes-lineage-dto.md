---
id: T5
title: "Expose stored-image inputs and lineage through the routes"
layer: "ports"
deps: ["T4"]
blocks: ["T6", "T8", "T9"]
acs: ["AC-04", "AC-12", "AC-13"]
files_hint: ["src/server/modules/generations/routes.ts", "src/server/modules/generations/rerun-routes.int.test.ts", "src/web/lib/api.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T5 — Expose stored-image inputs and lineage through the routes

## Place in the sequence

- **Blocked by:** T4 — Resolve stored-image references and record lineage when starting a generation · **Blocks:** T6 — Fill the generate panel from a re-run or reuse source, T8 — Add Re-run, Use as input and the lineage card to the detail view, T9 — Verify derived generations survive source deletion and the NFRs.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to see which generation a result came from and which generations were made from it
> **So that** I can follow how an image evolved
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: expose stored-image inputs and lineage through the routes.

## Inlined context

> | Stored-image reference | … resolved only through `generation_inputs` / `generation_images` rows, never as a path; any miss → one generic field error «not an image stored by gen-img» (no existence leak) |
> | Lineage | … recorded only if the source exists at start; no FK — a deleted source reads as «deleted» |
>
> — `sad.md §8, two rows, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `POST /generations` — `StartGenerationRequest` gains `source: {id, relation: rerun|reuse, output?}` and `inputs: [{stored: {generationId, kind: input|output, position}} | {upload: n}]` (≤ 8, ordered; absent → uploads in order). Errors: `400 VALIDATION_ERROR` with `details.fields.source` («The source generation no longer exists») / `details.fields["inputs.N"]` («Not an image stored by gen-img», or size/format reason) / `details.fields.inputs`; `409 GENERATION_IN_PROGRESS`; `403 FORBIDDEN`.

— `contracts/openapi.yaml, operationId startGeneration, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

- `GET /generations/{id}` — Generation gains `source: {id, relation, output, exists} | null` and `derived: {items: [{id, relation, output, createdAt}] (≤ 50, newest first), total}`.

— `contracts/openapi.yaml, operationId getGeneration, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-04 — happy path

> **Given** a generation from which other generations were re-run or reused
> **When** the Owner opens its detail view
> **Then** the system lists those derived generations (newest first, how each was derived, link to each); a generation with no source and no derived generations shows no lineage section
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — authorization

> **Given** a page from another site is open in the Owner's browser
> **When** it tries to start a re-run or reuse, or to read a generation's lineage
> **Then** gen-img refuses: nothing is sent to a provider, no balance is spent and no data is handed to that page
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — authorization

> **Given** a start request that refers to a stored image by its generation and position
> **When** that reference does not match an image gen-img stored (an unknown generation, a position that does not exist, or anything that is not a stored generation image)
> **Then** the system refuses the request without revealing whether any such file exists, and sends nothing
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `routes.ts`: JSON start already passes the body; multipart keeps working with `inputs` slots
- [ ] Detail DTO: `source` + `derived` (via service)
- [ ] `src/web/lib/api.ts`: `startGeneration(body, files)` sends JSON when no files (refs ride in the body)
- [ ] Tests in `rerun-routes.int.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| Origin https://evil.example | 403 FORBIDDEN, provider not called |
| ref to generations/../gen-img.db-like id | 400 generic, no read |

## Definition of Done

- [ ] integration tests via app.request(): JSON start with stored refs only → 202; multipart with mixed refs and uploads keeps order; detail returns source (exists true/false) + derived; cross-site start → 403; crafted refs → 400 generic
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
