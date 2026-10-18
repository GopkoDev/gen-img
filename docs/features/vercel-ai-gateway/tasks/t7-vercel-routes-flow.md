---
id: T7
title: "Run the Vercel flow end to end through the API"
layer: "ports"
deps: ["T6"]
blocks: ["T8", "T9", "T10"]
acs: ["AC-01", "AC-04", "AC-09", "AC-10", "AC-12", "AC-14"]
files_hint: ["src/server/modules/generations/vercel-flow.int.test.ts", "src/server/modules/providers/routes.int.test.ts", "tests/helpers/test-app.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T7 — Run the Vercel flow end to end through the API

## Place in the sequence

- **Blocked by:** T6 — Resolve pending costs in the background and resume them on boot · **Blocks:** T8 — Add the provider selector to the generate panel, T9 — Show pending costs that update themselves, and provider names, T10 — Prove OpenRouter is unchanged and the NFRs hold with two providers.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to pick OpenRouter or Vercel AI Gateway in the generate panel and see that provider's image models
> **So that** I can generate through either of my accounts from one place
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: run the Vercel flow end to end through the API.

## Inlined context

> No new operations: the pending lifecycle is observed by re-reading `getGeneration` / `listGenerations` (sad §8 UI polling).
>
> — `contracts/api-sync-report.md, Changes, verbatim` · full text: [api-sync-report.md](../contracts/api-sync-report.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `ProviderId` `[openrouter, vercel]` everywhere; `CostStatus.pending` produced; operations unchanged.

— `contracts/openapi.yaml v0.3.0, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 — happy path

> **Given** both providers are configured and the Owner selects Vercel AI Gateway in the generate panel
> **When** the Owner picks an image-only model, enters a prompt and generates
> **Then** the system shows «generating», then the output images, and the new generation appears at the top of the gallery labelled with Vercel AI Gateway
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-04 — happy path

> **Given** the Owner selected a Vercel model that accepts input images
> **When** the Owner attaches images, writes a prompt and generates
> **Then** the generation is saved with copies of the input images, exactly like an OpenRouter generation with inputs
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — error

> **Given** the Owner selected a Vercel model
> **When** the Owner asks for more images than the model makes, or attaches input images to a model that does not accept them
> **Then** the system does not send anything and tells the Owner which field must be fixed and how
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — cross-context

> **Given** only one of the two providers is configured
> **When** the Owner selects the unconfigured one
> **Then** the panel explains how to configure it and offers no generation for it, while the configured provider and the gallery keep working
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — happy path

> **Given** the gallery holds generations from both providers
> **When** the Owner browses it or opens a detail view
> **Then** every tile and detail view names the provider that made the generation, and generations from both providers are ordered together newest first
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — authorization

> **Given** a page from another site is open in the Owner's browser
> **When** it tries to start a Vercel generation
> **Then** gen-img refuses as for OpenRouter: nothing is sent and no balance is spent
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] test-app: `aiGatewayApiKey` override + fake timers/now passthrough
- [ ] flow tests with a fake fetch routing by host

## Edge cases

| Case | Behaviour |
|---|---|
| Vercel key missing, OpenRouter set | Vercel 409, OpenRouter generates |

## Definition of Done

- [ ] integration tests via app.request(): providers list shows both; Vercel models list; start (JSON and multipart) → job → detail pending → resolved known by the fake lookup; validation against Vercel limits; not-configured 409 while OpenRouter works; foreign page refused; mixed gallery newest first with provider
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
