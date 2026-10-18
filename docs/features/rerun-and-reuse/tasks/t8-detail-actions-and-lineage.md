---
id: T8
title: "Add Re-run, Use as input and the lineage card to the detail view"
layer: "ui"
deps: ["T5"]
blocks: []
acs: ["AC-02", "AC-03", "AC-04", "AC-07", "AC-09", "AC-15"]
files_hint: ["src/web/features/gallery/GenerationDetail.tsx", "src/web/features/gallery/Lineage.tsx", "src/web/features/gallery/Lineage.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T8 — Add Re-run, Use as input and the lineage card to the detail view

## Place in the sequence

- **Blocked by:** T5 — Expose stored-image inputs and lineage through the routes · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to turn one output image of a generation into the input of a new one in one action
> **So that** I can refine a result without downloading and uploading it
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: add Re-run, Use as input and the lineage card to the detail view.

## Inlined context

> | default | … «Re-run» next to Delete …; under each output image … «Use as input» |
> | reuse refused | … «Can't be used as an input: larger than 10 MB»; nothing navigates |
> | lineage — source / source deleted / derived | `Card` «Lineage» … «and N more» when total > 50 |
>
> — `screens.md §SCR-03, abridged` · full text: [screens.md](../screens.md)

> navigate to `/?rerun=<id>` or `/?reuse=<id>&output=<n>`; the panel reads it on mount, loads the source, fills the draft, then replaces the address with `/`.
>
> — `adr/0019, option 1, verbatim` · full text: [ADR-0019](../adr/0019-carry-the-draft-source-in-the-home-address-and-apply-it-once.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /generations/{id}` — Generation gains `source: {id, relation, output, exists} | null` and `derived: {items: [{id, relation, output, createdAt}] (≤ 50, newest first), total}`.

— `contracts/openapi.yaml, operationId getGeneration, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

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

### AC-04 — happy path

> **Given** a generation from which other generations were re-run or reused
> **When** the Owner opens its detail view
> **Then** the system lists those derived generations (newest first, how each was derived, link to each); a generation with no source and no derived generations shows no lineage section
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — domain invariant

> **Given** a derived generation and its source generation
> **When** the Owner deletes the source
> **Then** the deletion goes ahead without asking about derived generations beyond the usual confirmation, the derived generation keeps all its images and input copies, and its lineage shows «source deleted» instead of a link
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — error

> **Given** an output image that cannot be used as an input (larger than 10 MB or not a supported picture)
> **When** the Owner chooses «Use as input» on it
> **Then** the system refuses to attach it, says why in plain language, and sends nothing
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — domain invariant

> **Given** a derived generation was itself re-run or reused
> **When** the Owner opens any generation in that chain
> **Then** each detail view shows only its own direct source and its own direct derived generations — one level each way
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `Lineage.tsx` card per SCR-03
- [ ] `GenerationDetail.tsx`: Re-run button, per-output Use as input (pre-check byteSize/mediaType)
- [ ] Tests in `Lineage.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| total 53 | 50 items + «and 3 more» |
| source exists=false | «source deleted», no link |

## Definition of Done

- [ ] web tests: Re-run links to /?rerun=<id>; Use as input links to /?reuse=<id>&output=N and is refused in place for > 10 MB / unsupported outputs; lineage card shows source link or «source deleted», derived list newest first with «and N more», hidden when empty
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
