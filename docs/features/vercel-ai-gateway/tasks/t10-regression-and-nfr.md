---
id: T10
title: "Prove OpenRouter is unchanged and the NFRs hold with two providers"
layer: "tests"
deps: ["T7"]
blocks: []
acs: ["AC-13", "AC-15"]
files_hint: ["src/server/nfr.int.test.ts", "src/server/modules/generations/regression.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T10 — Prove OpenRouter is unchanged and the NFRs hold with two providers

## Place in the sequence

- **Blocked by:** T7 — Run the Vercel flow end to end through the API · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to pick OpenRouter or Vercel AI Gateway in the generate panel and see that provider's image models
> **So that** I can generate through either of my accounts from one place
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: prove OpenRouter is unchanged and the NFRs hold with two providers.

## Inlined context

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

Exercises existing operations.

## Acceptance criteria

### AC-13 — authorization

> **Given** the Vercel key is configured
> **When** anyone inspects what the app shows in the browser — the panel, the gallery, a detail view including the raw request — or the stored data
> **Then** the Vercel key appears nowhere, and price lookups are made only by gen-img itself, never by the browser
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-15 — cross-context

> **Given** Vercel AI Gateway has been added
> **When** the Owner generates through OpenRouter, with or without input images
> **Then** everything behaves exactly as before this feature: same parameters offered, same request sent, cost known from the answer, same gallery and detail view
>
> — `spec.md §5, AC-15, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Regression: OpenRouter text-only and with inputs produce the same request body and `known` cost as before
- [ ] NFR (serial `nfr` project, `src/server/nfr.int.test.ts`): mixed-provider gallery page timing
- [ ] Stored-row scans for the three Vercel paths in `regression.int.test.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| OpenRouter answer without cost | still unavailable, never pending |

## Definition of Done

- [ ] tests: OpenRouter request body and cost handling identical to before (fixture comparison); stored rows for all three Vercel paths contain neither the key nor base64; mixed 1 000-row gallery page ≤ 300 ms p95 (nfr project)
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
