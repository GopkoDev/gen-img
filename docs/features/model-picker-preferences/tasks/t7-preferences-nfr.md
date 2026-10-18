---
id: T7
title: "Prove the preference timings in the nfr project"
layer: "tests"
deps: ["T2"]
blocks: []
acs: ["AC-03"]
files_hint: ["src/server/modules/models/nfr.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T7 — Prove the preference timings in the nfr project

## Place in the sequence

- **Blocked by:** T2 — Read and set model preferences through a models module · **Blocks:** — · **Wave:** 3 — needs the routes.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** my favorites and hidden models remembered per provider on my machine across restarts
> **So that** I curate once and the picker stays the way I left it
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task measures the spec's timing targets for reading and saving preferences.

## Inlined context

> Picker opens with its groups and ★ states | ≤ 100 ms p95 of Ukiyo's own work once the model list is cached, with 100 models and 100 stored preferences | serial `nfr` project over a seeded data dir (component test checks the groups and ★ states)
>
> — `spec.md §6, row 1, verbatim` · full text: [spec.md](../spec.md)

> Saving a ★ change | ≤ 50 ms p95 of Ukiyo's own work | integration test (serial `nfr` project)
>
> — `spec.md §6, row 2, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Reads/writes `model_preferences` (seeded with 100 rows).

## API contract

- `GET /api/model-preferences?provider=` and `PATCH /api/model-preferences` (T2).

## Acceptance criteria

### AC-03 (US-02, US-04) — happy path

> **Given** the Owner has the model picker open
> **When** the Owner clicks or keyboard-activates the ★ toggle on a model's entry
> **Then** the model becomes a favorite (filled ★) or stops being one (empty ★), the picker stays open with the selected model unchanged, and the choice is kept on the machine — it is still there after reloading the page or restarting Ukiyo
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] seed 100 models in a stubbed catalog + 100 preferences; measure list p95 ≤ 100 ms and PATCH p95 ≤ 50 ms over ≥ 50 runs — `src/server/modules/models/nfr.int.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| cold catalog | excluded from timing (warm once first) |

## Definition of Done

- [ ] `pnpm test --project nfr` passes with both targets
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
