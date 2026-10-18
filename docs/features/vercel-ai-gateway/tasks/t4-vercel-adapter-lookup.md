---
id: T4
title: "Look up Vercel prices and register the adapter"
layer: "infra"
deps: ["T3"]
blocks: ["T6"]
acs: ["AC-05", "AC-07", "AC-13"]
files_hint: ["src/server/modules/providers/vercel.ts", "src/server/modules/providers/vercel.test.ts", "src/server/modules/providers/registry.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T4 — Look up Vercel prices and register the adapter

## Place in the sequence

- **Blocked by:** T3 — Build the Vercel adapter: catalog and the three call paths · **Blocks:** T6 — Resolve pending costs in the background and resume them on boot.
- **Lane:** shares files with T3 — serialized.

## Why (user story)

> **As an** Owner
> **I want** a generation whose price isn't known yet to show «pending» and update to the final amount (or «unavailable») by itself
> **So that** I track spending accurately without refreshing or guessing
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: look up Vercel prices and register the adapter.

## Inlined context

> `GET /v1/generation?id={generation_id}` → `{data:{id, total_cost, upstream_inference_cost, is_byok, …}}`. «Usage events are ingested asynchronously, so a lookup issued immediately after the generation completes returns `Usage event not found`… treat that response as "not yet"». `total_cost` «Does not include cost of BYOK requests»; `upstream_inference_cost` «Non-zero only for BYOK generations».
>
> — `Vercel REST API reference, Look up a generation, accessed 2026-10-18, abridged` · full text: [sad.md §2](../sad.md)

> | Call-path choice | … `type: image` → images API; `type: language` + tag `image-generation` → chat (`modalities: ["text","image"]`); any inputs → `/images/edits` with `images[].image_url` data URLs |
> | Parameters offered | Vercel: `n` ≤ 4 for image-only, 1 for chat models; inputs where catalog input modalities include image (≤ 8); never seed / aspect ratio |
> | Money | … else cost reference present → `pending`; else `unavailable`. Lookup: non-BYOK → `total_cost`; BYOK → `upstream_inference_cost` if > 0 (D3), else `unavailable` |
> | Raw exchange | Vercel: `data[].b64_json` and chat `message.images[].image_url.url` → `{"$image": N}`; edit inputs → `{"$input": N}`; no `Authorization` |
>
> — `sad.md §8, four rows, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-05 — domain invariant

> **Given** a Vercel generation succeeded but its answer did not state a price
> **When** it is saved and the Owner opens it in the gallery or detail view
> **Then** it appears immediately with cost status «pending» — never as zero — and, without the Owner reloading, changes to the final amount (status «known») once the provider reports it, or to «unavailable» if the provider still has not reported it 10 minutes after the provider's answer arrived
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — error

> **Given** the provider's price lookup fails or answers something unusable for a generation
> **When** the lookup gives up
> **Then** the generation's cost becomes «unavailable», the generation itself stays intact and visible, and the Owner is not shown an error for it
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — authorization

> **Given** the Vercel key is configured
> **When** anyone inspects what the app shows in the browser — the panel, the gallery, a detail view including the raw request — or the stored data
> **Then** the Vercel key appears nowhere, and price lookups are made only by gen-img itself, never by the browser
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `lookupCost(ref, signal)`: GET `/generation?id=` with the key; map per sad §8 Money
- [ ] Register `createVercelProvider({apiKey: config.aiGatewayApiKey, fetch})` in `registry.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| 404 Usage event not found | not-yet |
| is_byok with upstream 0 | unavailable |
| malformed body | unavailable |

## Definition of Done

- [ ] unit tests: lookup → known (total_cost), BYOK → upstream cost or unavailable, «not found» → not-yet, 401/other failure → unavailable, network error → not-yet; registry lists OpenRouter then Vercel
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
