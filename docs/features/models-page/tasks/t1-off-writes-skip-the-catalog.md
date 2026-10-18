---
id: T1
title: "Accept preference writes that only turn flags off without checking the provider"
layer: "ports"
deps: []
blocks: ["T4"]
acs: ["AC-08", "AC-11", "AC-12"]
files_hint: ["src/server/modules/models/routes.ts", "src/server/modules/models/routes.int.test.ts", "src/server/modules/models/nfr.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T1 — Accept preference writes that only turn flags off without checking the provider

## Place in the sequence

- **Blocked by:** — · **Blocks:** T4 — Build the Models page section · **Wave:** 1 — server rule, no deps.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to see models whose preferences are kept but which their provider no longer offers, and forget them
> **So that** no hidden or favorite choice is stored without my knowing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task makes «Forget», un-hide and un-favorite work whatever the provider's state.

## Inlined context

> **Chosen:** Option 1 … Same PATCH; the catalog is consulted only when the request turns a flag on — a request whose named flags are all `false` skips the provider and catalog checks (unknown provider still refused).
>
> — `adr/0029, options + outcome, abridged` · full text: [adr/0029-turn-preference-flags-off-without-checking-the-provider-catalog.md](../adr/0029-turn-preference-flags-off-without-checking-the-provider-catalog.md)

> provider must be known (404 otherwise); the catalog check (offered / list down / no key) runs only when the request sets a flag to `true`
>
> — `sad.md §8, Write check, verbatim` · full text: [sad.md](../sad.md)

> Saving a toggle | ≤ 50 ms p95 of Ukiyo's own work (step 9) | existing nfr test
>
> — `spec.md §6, row 3, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Reads/writes `model_preferences` (step 9, migration 0008) — no schema change. An all-false write merges and deletes the row.

— `data-model.md` absent (no schema change); `migrations/0008_create_model_preferences.up.sql`

## API contract

- `PATCH /api/model-preferences` — all named flags `false` → `200 ModelPreference` for any model id of a known provider, without the catalog; `404` unknown provider always; `404`/`409`/`502` (unknown model / not configured / list down) only when a flag turns on.

— `contracts/openapi.yaml, setModelPreference, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-08 (US-04) — happy path

> **Given** Ukiyo keeps a favorite or hidden preference for a model its provider no longer lists
> **When** the Owner opens the Models page
> **Then** a «No longer offered» list under that provider's table shows the model id with its kept preference, and «Forget» removes the preference so it no longer appears anywhere — and a «Forget» still succeeds if the provider's list became unavailable after the page loaded
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)
### AC-11 (US-01) — authorization

> **Given** Ukiyo is running
> **When** a page from another site in the Owner's browser asks Ukiyo for the model list, prices or preferences, or tries to change a preference
> **Then** Ukiyo refuses, like every other Ukiyo request
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)
### AC-12 (US-02, US-04) — domain invariant

> **Given** a request only turns a model's favorite or hidden flag off
> **When** it reaches Ukiyo while the provider doesn't list that model, its list can't be loaded, or the provider has no key
> **Then** Ukiyo accepts it — turning a preference off never needs the provider — while turning a flag on still needs a model the provider offers, and a provider Ukiyo doesn't know is still refused (step 9)
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] skip the configured/catalog checks when every named flag is false — `routes.ts`
- [ ] integration tests: forget a retired id (200, row gone), un-hide while the catalog fails (200), un-favorite with the provider unconfigured (200), turn-on still 404/409/502, unknown provider 404 on an off-write, foreign page 403 on an off-write — `routes.int.test.ts`
- [ ] extend the nfr test with the off-write path — `nfr.int.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| off-write for a never-stored id | 200, both false, updatedAt null |
| favorite:false + hidden:true | a flag turns on → catalog check applies |
| unknown provider, off-write | 404 |
| catalog down, off-write | 200 |

## Definition of Done

- [ ] integration tests above pass
- [ ] nfr off-write p95 ≤ 50 ms
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
