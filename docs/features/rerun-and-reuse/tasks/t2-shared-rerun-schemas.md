---
id: T2
title: "Extend the shared start and detail schemas and add the parameter carry-over rule"
layer: "domain"
deps: []
blocks: ["T3", "T7"]
acs: ["AC-05", "AC-13"]
files_hint: ["src/shared/generations.ts", "src/shared/rerun.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T2 — Extend the shared start and detail schemas and add the parameter carry-over rule

## Place in the sequence

- **Blocked by:** — · **Blocks:** T3 — Store lineage and look up stored images and derived generations in the repo, T7 — Keep supported parameters and name removed ones when the model changes.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to switch the pre-filled request to another model or provider before generating
> **So that** I compare models on the same request safely
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task delivers: extend the shared start and detail schemas and add the parameter carry-over rule.

## Inlined context

> **One re-validation rule for every model switch** … when the model changes, the panel keeps each parameter the new model supports, removes the rest and names them, and lowers `n` to the model's maximum; the server's existing `checkAgainstModel` stays the final guard.
>
> — `sad.md §4, choice 4, abridged` · full text: [sad.md](../sad.md)

> **Chosen:** Option 1 … the request lists inputs in order as `{stored: {generationId, kind, position}}` or `{upload: n}`; the server looks each reference up in `generation_inputs` / `generation_images`, reads the recorded file, runs the same input checks as for uploads, then continues exactly like an upload (own copies staged in the save transaction).
>
> — `adr/0017, option 1 + outcome, abridged` · full text: [ADR-0017](../adr/0017-refer-to-stored-images-by-generation-and-position-and-read-them-server-side.md)

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

### AC-05 — domain invariant

> **Given** a re-run form pre-filled from a generation
> **When** the Owner switches to a model or provider that does not support some of the pre-filled parameters (seed, aspect ratio, number of images) or input images
> **Then** the system removes the unsupported parameters from the form and names each one to the Owner («not supported by this model: seed»), marks input images the new model cannot take, lowers the number of images to the new model's maximum and names that too, and never sends a parameter or image the chosen model does not support
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — authorization

> **Given** a start request that refers to a stored image by its generation and position
> **When** that reference does not match an image gen-img stored (an unknown generation, a position that does not exist, or anything that is not a stored generation image)
> **Then** the system refuses the request without revealing whether any such file exists, and sends nothing
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `src/shared/generations.ts`: `SourceRef`, `StoredImageRef`, `UploadSlot`, `InputSlot`; `StartGenerationRequest` + optional `source`, `inputs` (≤ 8) with refinements (reuse ⇔ output)
- [ ] `Generation` DTO + `source` (nullable, with `exists`) and `derived` ({items ≤ 50, total})
- [ ] `carryParams(params, model)` → `{ params, removed: string[] }` (seed, aspect ratio removed when unsupported/invalid; n clamped to the model max, named «images lowered to N»)
- [ ] Unit tests in `src/shared/rerun.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| reuse without output | rejected: «Choose which output to reuse» |
| rerun with output | rejected |
| aspect ratio not in the new model's values | removed and named |
| n 4 → model max 1 | lowered, named |

## Definition of Done

- [ ] unit tests: StartGenerationRequest accepts source + ordered inputs (stored refs, upload slots) and rejects reuse without output / rerun with output / >8 inputs; carryParams keeps supported params, removes and names the rest, clamps n
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
