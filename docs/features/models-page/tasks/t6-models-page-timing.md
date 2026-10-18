---
id: T6
title: "Measure the Models page rendering in a serial web timing project"
layer: "tests"
deps: ["T4"]
blocks: []
acs: ["AC-01"]
files_hint: ["vitest.config.ts", "src/web/features/models/ModelsPage.nfr.test.tsx", "CLAUDE.md"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T6 — Measure the Models page rendering in a serial web timing project

## Place in the sequence

- **Blocked by:** T4 — Build the Models page section · **Blocks:** — · **Wave:** 3 — needs the page.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a Models page listing every image model of each configured provider with its published price and the parameters it supports
> **So that** I can compare models without selecting them one by one
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task proves the page's rows render fast with a full catalog.

## Inlined context

> Models page shows its rows | ≤ 300 ms p95 after the model lists are cached, with 100 models and 100 stored preferences | serial timing run like the `nfr` project — a jsdom `*.nfr.test.tsx` over a seeded list, 20 renders
>
> — `spec.md §6, row 1, abridged` · full text: [spec.md](../spec.md)

> `web` excludes `**/*.nfr.test.tsx`; new serial `nfr-web` project (jsdom, setup-dom, fileParallelism false, groupOrder 1)
>
> — `sad.md §5, vitest.config.ts, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface (api mocked).

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** at least one provider is configured
> **When** the Owner opens the Models section
> **Then** the page shows one table per configured provider, in the provider's order, with one row per image model: name, id, published price in step 7's short wording («$0.0184 / image», a range, «priced per token», «price unknown» or «price unknown — couldn't load», never $0), and the parameters the model supports — aspect ratios, seed, the most images per request and the input-image range, with «—» for what it doesn't support; rows appear before their prices arrive, a price still loading shows «…», and a row's price is looked up only once the row comes into view, so the table never asks for prices of rows the Owner hasn't scrolled to
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] add the `nfr-web` project and exclude `*.nfr.test.tsx` from `web` — `vitest.config.ts`
- [ ] timing test: 100 models + 100 preferences, 20 renders, p95 ≤ 300 ms — `ModelsPage.nfr.test.tsx`
- [ ] CLAUDE.md test-projects row lists `nfr-web`

## Edge cases

| Case | Behaviour |
|---|---|
| first render (cold modules) | excluded from the sample |

## Definition of Done

- [ ] `pnpm test` runs nfr-web last and the p95 holds
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
