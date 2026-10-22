---
id: T2
title: "Read and set model preferences through a models module"
layer: "ports"
deps: ["T1"]
blocks: ["T5", "T7"]
acs: ["AC-03", "AC-06", "AC-07", "AC-08", "AC-12"]
files_hint: ["src/shared/models.ts", "src/server/modules/models/", "src/server/app.ts", "src/web/lib/api.ts", "tests/helpers/models.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T2 — Read and set model preferences through a models module

## Place in the sequence

- **Blocked by:** T1 — Promote the model_preferences migration · **Blocks:** T5 — Build the ModelPicker popover with prices and favorite toggles, T7 — Prove the preference timings in the nfr project · **Wave:** 2 — needs the table.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a ★ toggle on each picker entry that marks or unmarks the model as a favorite without selecting it
> **So that** I can curate my short list right where I choose models
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** my favorites and hidden models remembered per provider on my machine across restarts
> **So that** I curate once and the picker stays the way I left it
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task stores and returns the Owner's per-model choices, refusing models the provider doesn't offer.

## Inlined context

> a model is accepted only when the provider's cached catalog lists it; catalog unavailable → refused, nothing stored
>
> — `sad.md §8, Write check, verbatim` · full text: [sad.md](../sad.md)

> a write changes only the flags named in it and keeps the other stored flag (a ★ never undoes a hide made elsewhere); upsert the result; both flags off → row deleted; rows of models missing from the catalog are kept and simply not shown
>
> — `sad.md §8, Row lifecycle, verbatim` · full text: [sad.md](../sad.md)

> unknown provider or model → `NOT_FOUND`; catalog unavailable → `PROVIDER_ERROR` (502); bad body → `VALIDATION_ERROR` (400)
>
> — `sad.md §8, Errors, verbatim` · full text: [sad.md](../sad.md)

> **Chosen:** Option 1 … New module `src/server/modules/models/` (repo + routes) — the providers module stays the owner of catalogs and prices.
>
> — `adr/0026, Decision outcome + Neutral, abridged` · full text: [adr/0026-keep-model-preferences-as-one-row-per-provider-and-model-in-a-models-module.md](../adr/0026-keep-model-preferences-as-one-row-per-provider-and-model-in-a-models-module.md)

> Saving a ★ change ≤ 50 ms p95 of Ukiyo's own work
>
> — `spec.md §6, row 2, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Reads/writes `model_preferences` (provider, model, favorite, hidden, updated_at) — PK (provider, model); rows parsed through zod before leaving the repo.

— `data-model.md §Entities, model_preferences, abridged` · full text: [data-model.md](../data-model.md)

## API contract

- `GET /api/model-preferences?provider=` → `200 PreferencesResponse { preferences: ModelPreference[] }` · errors: `400 VALIDATION_ERROR`, `403 FORBIDDEN`.
- `PATCH /api/model-preferences` body `SetPreferenceRequest { provider, model, favorite?, hidden? }` (≥ 1 flag) → `200 ModelPreference { provider, model, favorite, hidden, updatedAt | null }` · errors: `400`, `403`, `404 NOT_FOUND`, `409 PROVIDER_NOT_CONFIGURED`, `502 PROVIDER_ERROR`.

— `contracts/openapi.yaml, listModelPreferences + setModelPreference, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-03 (US-02, US-04) — happy path

> **Given** the Owner has the model picker open
> **When** the Owner clicks or keyboard-activates the ★ toggle on a model's entry
> **Then** the model becomes a favorite (filled ★) or stops being one (empty ★), the picker stays open with the selected model unchanged, and the choice is kept on the machine — it is still there after reloading the page or restarting Ukiyo
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-06 (US-02) — error

> **Given** a request asks to mark a model the provider doesn't offer, or names an unknown provider
> **When** it reaches Ukiyo
> **Then** Ukiyo refuses it and says the model (or provider) is unknown, and keeps no preference for it
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)
### AC-07 (US-04) — domain invariant

> **Given** two providers offer a model with the same id
> **When** the Owner marks it as a favorite under one provider
> **Then** it is a favorite only under that provider — a model holds exactly one set of preferences per provider, and toggling twice in a row ends where it started
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-04) — domain invariant

> **Given** a favorite or hidden model is no longer offered by its provider
> **When** the Owner opens the picker
> **Then** the model does not appear in any group (no entry for a model that can't be chosen), and its preference is kept so it comes back as before if the provider offers the model again
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)
### AC-12 (US-04) — authorization

> **Given** Ukiyo is running
> **When** a page from another site in the Owner's browser asks Ukiyo to read or change model preferences
> **Then** Ukiyo refuses, like every other Ukiyo request — no preferences are handed out or changed
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] zod schemas `ModelPreference`, `PreferencesResponse`, `SetPreferenceRequest` — `src/shared/models.ts`
- [ ] repo `list(provider)` / `set(provider, model, flags)` (merge with the stored row, upsert or delete) — `src/server/modules/models/repo.ts`
- [ ] routes `registerModelsRoutes(app, { repo, providers, catalog })` with the catalog check — `src/server/modules/models/routes.ts`
- [ ] wire into `createApp` — `src/server/app.ts`
- [ ] client `api.modelPreferences(provider)` / `api.setModelPreference(body)` — `src/web/lib/api.ts`
- [ ] `seedModelPreference` helper — `tests/helpers/models.ts`
- [ ] integration tests `src/server/modules/models/routes.int.test.ts` (+ repo int test)

## Edge cases

| Case | Behaviour |
|---|---|
| favorite only in body, row had hidden=1 | row keeps hidden=1, favorite updated |
| both flags end up off | row deleted, response flags false, updatedAt null |
| model not in catalog | 404, nothing stored |
| catalog fetch fails | 502, nothing stored |
| provider not configured | 409 |
| foreign Origin | 403 (request guard) |
| row for a model no longer in catalog | still returned by the list |

## Definition of Done

- [ ] integration tests cover every edge case above
- [ ] restart test: reopen the data dir and the preferences are there
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
