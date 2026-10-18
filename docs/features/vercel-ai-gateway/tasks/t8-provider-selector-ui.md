---
id: T8
title: "Add the provider selector to the generate panel"
layer: "ui"
deps: ["T7"]
blocks: []
acs: ["AC-01", "AC-03", "AC-09", "AC-10", "AC-11"]
files_hint: ["src/web/features/generate/GeneratePanel.tsx", "src/web/features/generate/ProviderSelect.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T8 — Add the provider selector to the generate panel

## Place in the sequence

- **Blocked by:** T7 — Run the Vercel flow end to end through the API · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to pick OpenRouter or Vercel AI Gateway in the generate panel and see that provider's image models
> **So that** I can generate through either of my accounts from one place
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: add the provider selector to the generate panel.

## Inlined context

> | default | ≥ 1 provider configured; first configured one preselected (OpenRouter when both) | Select «Provider» (first field) … an unconfigured provider stays selectable and is suffixed «— not configured» |
> | provider not configured | … «Vercel AI Gateway is not configured.» + «Add AI_GATEWAY_API_KEY to .env.local and restart gen-img. Your gallery is still available.» |
>
> — `screens.md §SCR-01, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Uses `listProviders`, `listImageModels`, `startGeneration` via `src/web/lib/api.ts`.

## Acceptance criteria

### AC-01 — happy path

> **Given** both providers are configured and the Owner selects Vercel AI Gateway in the generate panel
> **When** the Owner picks an image-only model, enters a prompt and generates
> **Then** the system shows «generating», then the output images, and the new generation appears at the top of the gallery labelled with Vercel AI Gateway
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** the Owner opens the model picker with Vercel AI Gateway selected
> **When** the list loads
> **Then** it lists only the gateway models that can produce images — image-only models and multimodal language models the gateway's catalog marks as image-generating — by name and model id, and switching provider switches the list; the form offers up to 4 images per request for image-only models and exactly 1 for multimodal language models, input images only for models the catalog lists as taking image input (at most 8), and never a seed or aspect ratio control
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

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

### AC-11 — cross-context

> **Given** a generation is in progress on one provider
> **When** the Owner switches to the other provider and tries to generate
> **Then** the panel still shows «in progress» and does not submit — one generation at a time across both providers, so one click never spends twice
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Provider Select (first field) from `api.providers()`; state `providerId`; models query keyed by provider; reset model on switch; keep prompt + attachments
- [ ] Not-configured message per provider (env var name per provider)
- [ ] Body `provider` from state

## Edge cases

| Case | Behaviour |
|---|---|
| only Vercel configured | Vercel preselected |
| none configured | OpenRouter selected, its not-configured hint |

## Definition of Done

- [ ] web tests (mocked api): first configured provider preselected; switching loads that provider's models; Vercel models show no seed/aspect ratio and Images max per kind; unconfigured provider shows the AI_GATEWAY_API_KEY hint; in-progress job disables provider + model
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
