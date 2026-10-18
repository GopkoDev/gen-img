---
id: T3
title: "Share in-flight price lookups, cap them at 4 and cache failures for a minute"
layer: "infra"
deps: []
blocks: []
acs: ["AC-01", "AC-02"]
files_hint: ["src/server/modules/providers/prices.ts", "src/server/modules/providers/catalog.ts", "src/server/modules/providers/prices.int.test.ts", "src/server/modules/providers/prices.test.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T3 — Share in-flight price lookups, cap them at 4 and cache failures for a minute

## Place in the sequence

- **Blocked by:** — · **Blocks:** — · **Wave:** 1 — independent of the store.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** every entry of the model picker to show that model's published price in short form
> **So that** I can compare models while choosing, without selecting each one first
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task makes it safe for every picker entry to ask for its price.

## Inlined context

> server: in-flight dedupe, ≤ 4 concurrent in total (one semaphore for all providers), failures cached 60 s, successes 10 min
>
> — `sad.md §8, Price lookups, abridged` · full text: [sad.md](../sad.md)

> Provider requests for the picker's prices | ≤ 1 per model per 10 minutes, and never more than 4 in flight at once | unit test over the price cache with an injected clock (a failed lookup counts too: ≤ 1 retry per failing model per minute) + a concurrency-cap test
>
> — `spec.md §6, row 3, verbatim` · full text: [spec.md](../spec.md)

> Price lookups for the picker send the Owner's key | 0 requests with an authorization header | adapter tests assert headers
>
> — `spec.md §6, row 4, verbatim` · full text: [spec.md](../spec.md)

> the catalog shares its in-flight list load
>
> — `adr/0027, option 1, abridged` · full text: [adr/0027-look-up-every-listed-models-price-when-the-picker-opens-deduplicated-and-capped-on-the-server.md](../adr/0027-look-up-every-listed-models-price-when-the-picker-opens-deduplicated-and-capped-on-the-server.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /api/providers/{providerId}/price?model=` — unchanged shape; a provider failure stays `502 PROVIDER_ERROR`, now remembered for 60 s.

— `contracts/openapi.yaml, info.description, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner opens the model picker of a configured provider
> **When** the list of models is shown
> **Then** every entry shows its model's published price in short form — «$0.0184 / image», a range with both ends «$0.045–$0.151 / image», «priced per token» or «price unknown» — step 7's wording, as under the picker; prices are looked up when the Owner opens the picker, not when the page loads; while an entry's price is still loading it shows «…» without the entries moving under the pointer, and the Owner can choose a model before any price has arrived
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-02 (US-01) — domain invariant

> **Given** the provider publishes no price for a model, or its price can't be loaded right now
> **When** the picker shows that model's entry
> **Then** the entry says «price unknown» (with «couldn't load» when the lookup failed) — never $0, «free» or a blank — and the model can still be chosen and used; a failed lookup is tried at most once per model per opening of the picker
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] in-flight map + global semaphore (4) + failure cache (60 s, injected clock) — `prices.ts`
- [ ] in-flight list load shared by concurrent misses — `catalog.ts`
- [ ] unit tests with a controllable fake provider: 10 concurrent lookups → ≤ 4 in flight; same model twice concurrently → one upstream call; failure then retry within 60 s → no upstream call; after 60 s → one call
- [ ] keep the existing «no authorization header» adapter assertions green

## Edge cases

| Case | Behaviour |
|---|---|
| two lookups for the same model at once | one upstream request, both get its answer |
| lookup fails | 502 now and for the next 60 s without contacting the provider |
| unknown model | 404 without a provider request (step 7 AC-10) |
| 20 models at once | never more than 4 upstream at a time |

## Definition of Done

- [ ] unit tests for dedupe, cap and failure cache pass with an injected clock
- [ ] existing price/catalog tests stay green
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
