---
id: T3
title: "Store lineage and look up stored images and derived generations in the repo"
layer: "infra"
deps: ["T1", "T2"]
blocks: ["T4"]
acs: ["AC-02", "AC-04", "AC-07", "AC-15"]
files_hint: ["src/server/modules/generations/repo.ts", "src/server/modules/generations/lineage-repo.int.test.ts", "tests/helpers/generations.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T3 — Store lineage and look up stored images and derived generations in the repo

## Place in the sequence

- **Blocked by:** T1 — Promote the lineage migration, T2 — Extend the shared start and detail schemas and add the parameter carry-over rule · **Blocks:** T4 — Resolve stored-image references and record lineage when starting a generation.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to see which generation a result came from and which generations were made from it
> **So that** I can follow how an image evolved
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: store lineage and look up stored images and derived generations in the repo.

## Inlined context

> `generations.source_id`, `source_relation` (`rerun` / `reuse`), `source_output` (reuse only); a partial index on `source_id` for the derived list; a deleted source simply doesn't resolve. … Deletion code stays untouched: no constraint can block it.
>
> — `adr/0018, option 1 + outcome, abridged` · full text: [ADR-0018](../adr/0018-record-lineage-as-source-columns-without-a-foreign-key.md)

> | Stored-image reference | … resolved only through `generation_inputs` / `generation_images` rows, never as a path; any miss → one generic field error «not an image stored by gen-img» (no existence leak) |
> | Lineage | … recorded only if the source exists at start; no FK — a deleted source reads as «deleted» |
>
> — `sad.md §8, two rows, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generations.source_id` | TEXT | NULL, no FK | read + write |
| `generations.source_relation` | TEXT | NULL, CHECK IN (rerun, reuse) | read + write |
| `generations.source_output` | INTEGER | NULL, CHECK ≥ 1 (reuse only) | read + write |
| index `generations_source` | (source_id, id) WHERE source_id IS NOT NULL | partial | read + write |

— `data-model.md §Entities, generations (added columns) + §Indexes, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-02 — happy path

> **Given** the Owner generated from a re-run form
> **When** the new generation is saved and the Owner opens it
> **Then** its detail view says «Re-run of» with a link to the source generation, it holds its own copies of the input images, and the source's detail view lists it among the generations made from it
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

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

### AC-15 — domain invariant

> **Given** a derived generation was itself re-run or reused
> **When** the Owner opens any generation in that chain
> **Then** each detail view shows only its own direct source and its own direct derived generations — one level each way
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `repo.ts`: GenerationRow + `source_id`, `source_relation`, `source_output`; insert writes them
- [ ] `storedImage(generationId, kind, position)` via the PK of `generation_images` / `generation_inputs`
- [ ] `derivedOf(id, limit=50)` → `{items, total}` using `generations_source`; `exists(id)`
- [ ] `seedGeneration` accepts `source`; tests in `lineage-repo.int.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| source deleted | derived row unchanged; exists(source) false |
| position out of range | undefined |
| 51 derived | 50 items, total 51 |

## Definition of Done

- [ ] integration tests: insert + get round-trip the source columns; storedImage(generationId, kind, position) returns the recorded row or undefined; derivedOf(id) returns ≤ 50 newest + total; a deleted source reads as exists=false while the derived row is unchanged
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
