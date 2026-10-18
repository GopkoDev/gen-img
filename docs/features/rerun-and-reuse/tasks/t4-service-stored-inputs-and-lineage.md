---
id: T4
title: "Resolve stored-image references and record lineage when starting a generation"
layer: "app"
deps: ["T3"]
blocks: ["T5"]
acs: ["AC-02", "AC-03", "AC-08", "AC-09", "AC-13", "AC-14"]
files_hint: ["src/server/modules/generations/service.ts", "src/server/modules/storage/file-store.ts", "src/server/modules/generations/rerun.int.test.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T4 — Resolve stored-image references and record lineage when starting a generation

## Place in the sequence

- **Blocked by:** T3 — Store lineage and look up stored images and derived generations in the repo · **Blocks:** T5 — Expose stored-image inputs and lineage through the routes.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to open a past generation and start it again with everything pre-filled
> **So that** I repeat a request without retyping or re-uploading
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: resolve stored-image references and record lineage when starting a generation.

## Inlined context

> **Chosen:** Option 1 … the request lists inputs in order as `{stored: {generationId, kind, position}}` or `{upload: n}`; the server looks each reference up in `generation_inputs` / `generation_images`, reads the recorded file, runs the same input checks as for uploads, then continues exactly like an upload (own copies staged in the save transaction).
>
> — `adr/0017, option 1 + outcome, abridged` · full text: [ADR-0017](../adr/0017-refer-to-stored-images-by-generation-and-position-and-read-them-server-side.md)

> | Stored-image reference | … resolved only through `generation_inputs` / `generation_images` rows, never as a path; any miss → one generic field error «not an image stored by gen-img» (no existence leak) |
> | Lineage | … recorded only if the source exists at start; no FK — a deleted source reads as «deleted» |
>
> — `sad.md §8, two rows, abridged` · full text: [sad.md](../sad.md)

> **Hard rule:** never branch on provider inside `generations` (CLAUDE.md); keep the all-or-nothing save (ADR-0006) — the new generation stores its own input copies.
>
> — `sad.md §2 + CLAUDE.md, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.source_id` | TEXT | NULL, no FK | write |
| `generations.source_relation` | TEXT | NULL, CHECK IN (rerun, reuse) | write |
| `generations.source_output` | INTEGER | NULL, CHECK ≥ 1 (reuse only) | write |
| index `generations_source` | (source_id, id) WHERE source_id IS NOT NULL | partial | write |

— `data-model.md §Entities, generations (added columns) + §Indexes, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `POST /generations` — `StartGenerationRequest` gains `source: {id, relation: rerun|reuse, output?}` and `inputs: [{stored: {generationId, kind: input|output, position}} | {upload: n}]` (≤ 8, ordered; absent → uploads in order). Errors: `400 VALIDATION_ERROR` with `details.fields.source` («The source generation no longer exists») / `details.fields["inputs.N"]` («Not an image stored by gen-img», or size/format reason) / `details.fields.inputs`; `409 GENERATION_IN_PROGRESS`; `403 FORBIDDEN`.

— `contracts/openapi.yaml, operationId startGeneration, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-02 — happy path

> **Given** the Owner generated from a re-run form
> **When** the new generation is saved and the Owner opens it
> **Then** its detail view says «Re-run of» with a link to the source generation, it holds its own copies of the input images, and the source's detail view lists it among the generations made from it
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** a saved generation with one or more output images
> **When** the Owner chooses «Use as input» on one of its output images
> **Then** the generate form opens with exactly that image attached as the input image (replacing the previous draft's prompt, parameters and attachments), an empty prompt, and the currently chosen model kept if it accepts input images (otherwise the first model of the current provider that does); once generated, the new generation's detail view says «Made from output N of» with a link to the source
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — error

> **Given** the Owner opened a re-run or reuse form
> **When** the source generation was deleted (for example in another tab) before the Owner generates
> **Then** the system sends nothing to the provider, tells the Owner the source generation no longer exists, and keeps the prompt and settings in the form; the Owner can drop the link to the deleted source and attach images by hand. This holds even when nothing from the source's files is reused — a link is only recorded to a generation that exists when generating starts
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — error

> **Given** an output image that cannot be used as an input (larger than 10 MB or not a supported picture)
> **When** the Owner chooses «Use as input» on it
> **Then** the system refuses to attach it, says why in plain language, and sends nothing
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — authorization

> **Given** a start request that refers to a stored image by its generation and position
> **When** that reference does not match an image gen-img stored (an unknown generation, a position that does not exist, or anything that is not a stored generation image)
> **Then** the system refuses the request without revealing whether any such file exists, and sends nothing
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — cross-context

> **Given** a generation is already in progress
> **When** the Owner opens a re-run or reuse form and tries to generate
> **Then** the form shows that a generation is in progress and does not start a second one, exactly like a normal generation
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `file-store.ts`: `readRecorded(relPath)` → bytes of a recorded file
- [ ] `service.ts` `startGenerationChecked`: parse; if `source` given and `!repo.exists` → field `source`; resolve `inputs` in order (stored → repo.storedImage + readRecorded → checkInputFile; upload → the n-th file, each used once) → `InputFile[]`; any stored miss/read failure → `inputs.N`: «Not an image stored by gen-img»
- [ ] Pass the source through to `run` and `insertAtomic` (columns set only when present)
- [ ] Tests in `rerun.int.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| source deleted between lookup and read | same field error, nothing sent |
| upload slot used twice / unused file | `inputs`: «Every attached file must be used once» |
| no `inputs` given | uploads in order (unchanged clients) |

## Definition of Done

- [ ] integration tests with a fake provider: re-run from stored inputs sends the same bytes in order and saves own copies + lineage; reuse of an output; missing source / unknown ref / bad kind / out-of-range position → one generic field error, nothing sent; output > 10 MB refused; running job → GENERATION_IN_PROGRESS
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
