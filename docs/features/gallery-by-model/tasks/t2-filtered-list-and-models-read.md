---
id: T2
title: "Filter the list by model and read the models with counts and latest cards"
layer: "ports"
deps: ["T1"]
blocks: ["T4"]
acs: ["AC-01", "AC-02", "AC-05", "AC-06", "AC-08", "AC-09"]
files_hint: ["src/shared/generations.ts", "src/server/modules/generations/repo.ts", "src/server/modules/generations/routes.ts", "src/server/modules/generations/by-model.int.test.ts", "src/server/modules/generations/nfr.int.test.ts", "src/web/lib/api.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T2 — Filter the list by model and read the models with counts and latest cards

## Place in the sequence

- **Blocked by:** T1 — Promote the by-model index migration · **Blocks:** T4 — Add the view switch, the model choice and the filtered grid · **Wave:** 2.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to choose one of the models I have generated with and see only its generations
> **So that** I can judge that model's results
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** a view with one section per model, each with its count and latest results
> **So that** I can compare models side by side
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task gives the gallery's views their data.

## Inlined context

> the filter's `provider`/`model` are accepted as stored strings (1–200 chars, both or neither) — an unknown provider or model is an empty page, not 400/404 (AC-06); only a malformed query (one of the pair, bad cursor/limit/latest) → `VALIDATION_ERROR` (400)
>
> — `sad.md §8, Errors, verbatim` · full text: [sad.md](../sad.md)

> `count(*)`, `max(id) AS latestId`, ordered `latestId DESC`; `latest` 0–4 summaries per model via the filtered page query
>
> — `sad.md §8, Models read, verbatim` · full text: [sad.md](../sad.md)

> `GET /generations/models` registered before `GET /generations/:id` (like `cost-history`)
>
> — `sad.md §8, Route order, verbatim` · full text: [sad.md](../sad.md)

> A filtered page | any page (first or continued) of 24 items of one model, 1 000 generations across 30 models, each with 10 tags and a comment, ≤ 300 ms p95 server time | `nfr` test over a seeded data dir … Model choice and «By model» | the model list with counts, and the groups with their latest four cards, ≤ 300 ms p95 server time with 1 000 generations across 30 models | `nfr` test
>
> — `spec.md §6, rows 1–2, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Reads `generations` via `generations_by_model` (T1).

## API contract

- `GET /api/generations?provider=&model=&cursor=&limit=` → `GenerationPage` (empty for an unknown pair).
- `GET /api/generations/models?latest=0..4` → `{ models: ModelGroup[] }` (`provider, model, count, latestId, items`).
- Errors: `400 VALIDATION_ERROR`, `403 FORBIDDEN`.

— `contracts/openapi.yaml`, abridged

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner has generations with several models
> **When** the Owner opens the model choice in the gallery
> **Then** it lists every provider + model the Owner has generated with — the model's name or id, the provider, and how many generations it has — most recently used first, and choosing one shows only that model's generations, newest first, with the same cards and badges as the main grid
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-02 (US-02) — happy path

> **Given** the Owner has generations with several models
> **When** the Owner switches the gallery to «By model»
> **Then** it shows one section per provider + model, the most recently used first; each section names the model and provider, shows its count and its latest four cards, and offers «Show all N», which opens that model's filtered grid
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-01, US-02) — domain invariant

> **Given** generations are added or deleted while a view is shown
> **When** the view updates
> **Then** each generation belongs to exactly one model section and appears once; counts match what is shown when the end is reached; a new generation appears first in its model's view and moves its section to the top; a model with no generations left disappears from the choice and from «By model»; «Show all N» opens a grid of exactly N generations; a cost that becomes known, a tag or a comment shows on the generation's card in every view where it appears
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)
### AC-06 (US-01) — error

> **Given** the gallery's address names a model the Owner has no generations with (mistyped, or every generation of it deleted)
> **When** the gallery is shown
> **Then** it says plainly that there are no generations with that model (naming it) and offers to show all generations — not an error page and never «No generations yet» while other generations exist; a model is matched exactly as it was stored (same characters, same case), and any model id survives the address unchanged
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-01) — domain invariant

> **Given** two providers offer a model with the same id
> **When** the Owner has generated with both
> **Then** they are two separate entries in the choice and two sections in «By model», each with its own generations and count
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)
### AC-09 (US-01) — authorization

> **Given** Ukiyo is running
> **When** a page from another site in the Owner's browser asks Ukiyo for a filtered list or the model groups
> **Then** Ukiyo refuses, like every other Ukiyo request
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] shared schemas `ModelGroup`, `ModelGroupsResponse`; list query with optional pair
- [ ] repo `listPage({ …, provider?, model? })`, `modelGroups({ latest })`
- [ ] routes (models before `:id`)
- [ ] api client `generations(cursor, limit, filter?)`, `generationModels(latest)`
- [ ] integration tests: exact matching (case, `/`, `:`, `+`), two providers same id, counts vs pages, unknown pair → empty, one of the pair → 400, foreign page 403, deleted generation leaves its group; nfr rows

## Edge cases

| Case | Behaviour |
|---|---|
| unknown provider | empty page |
| model id with + / : | matched exactly |
| one of the pair | 400 |
| last generation of a model deleted | model absent from the read |

## Definition of Done

- [ ] integration + nfr tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
