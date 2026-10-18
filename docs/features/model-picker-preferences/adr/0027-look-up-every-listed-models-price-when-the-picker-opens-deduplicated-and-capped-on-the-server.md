---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 9"
---

# 0027 — Look up every listed model's price when the picker opens, deduplicated and capped on the server

- **Status:** Accepted (amends [ADR-0020](../../model-price-preview/adr/0020-load-a-models-price-lazily-through-an-optional-port-method.md): prices stay lazy and behind the optional `priceOf`, but «the selected model only» becomes «every model listed in an open picker»)
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Every picker entry must show its price (spec AC-01). OpenRouter publishes prices per model only, so a full list means one upstream request per model; Vercel's prices come with its listing. Today the price cache neither shares a request already in flight nor caches failures, `catalog.find` refetches the model list on every concurrent miss, and the browser retries 5xx answers three times — so one opening of a cold picker could become several requests per model (devil's-advocate pass, spec §1 ¶4).

## Decision drivers

- Spec §6: ≤ 1 provider request per model per 10 minutes, never more than 4 in flight; a failed lookup ≤ 1 retry per failing model per minute.
- Spec AC-01/AC-02: lookups start when the picker opens, not on page load; a failed one is tried at most once per opening; the list is usable before prices arrive.
- Step 7's guarantees: no key sent with a price lookup; an unknown model never reaches a provider URL.

## Considered options

1. **One query per entry through the existing price endpoint, enabled while the picker is open, with no client retries; the server's price cache shares in-flight lookups, caps them at 4 in flight in total (one semaphore for all providers), caches failures for 1 minute, and the catalog shares its in-flight list load** — the entries share the selected model's cache entry with the price line.
2. **A batch endpoint returning every listed model's price in one answer** — the server fans out internally and answers when all are done (or streams).
3. **Fetch every price when the catalog refreshes and send prices inside the model list** — ADR-0020's rejected option 2.

## Decision outcome

**Chosen:** Option 1. It keeps one price contract and one cache key per model, so an entry and the line under the picker can never disagree; a slow model doesn't delay the others; and the server, not the browser, enforces the provider-facing limits. Option 2 makes one slow model hold back every entry (or needs streaming); option 3 spends requests on every catalog refresh for prices nobody opened the picker to see.

## Consequences

**Positive**
- Opening the picker on a cold cache costs at most one request per model, 4 at a time; reopening within 10 minutes costs none.
- The server's limits also protect against several tabs or a later Models page (step 10) asking at once.

**Negative**
- Up to N small requests to localhost per opening — negligible locally, and answered from cache after the first.
- A model behind a failing lookup shows «couldn't load» for up to a minute even if the provider recovers sooner.

**Neutral**
- `PriceCatalog` gains a small semaphore and an in-flight map; `ModelCatalog` gains an in-flight list load.

## Links

- Spec: [[../spec.md]] AC-01, AC-02, §6
- SAD: [[../sad.md]] §4, §6, §8
- Related ADR: [ADR-0020](../../model-price-preview/adr/0020-load-a-models-price-lazily-through-an-optional-port-method.md)
