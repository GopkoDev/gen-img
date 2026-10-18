---
id: T9
title: "Expose providers and the cached model catalog"
layer: "ports"
deps: ["T4"]
blocks: ["T10"]
acs: ["AC-03", "AC-13", "AC-14"]
files_hint: ["src/server/modules/providers/routes.ts", "src/server/modules/providers/routes.int.test.ts", "src/shared/providers.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "todo"
step: ""
---

# T9 — Expose providers and the cached model catalog

## Place in the sequence

- **Blocked by:** T4 — Define the ImageProvider port and build the OpenRouter adapter · **Blocks:** T10 — Expose generations, job and file routes and wire the app.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to pick an OpenRouter image model, write a prompt, optionally set aspect ratio, seed and number of images, and generate
> **So that** I get images without leaving gen-img
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: expose providers and the cached model catalog.

## Inlined context

> | Caching | provider model catalog cached in memory 10 min per provider | `providers/routes.ts` |
>
> — `sad.md §8, Caching, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /providers` → 200 `ProvidersResponse {providers:[{id,name,configured}]}`.
- `GET /providers/{providerId}/models` → 200 `ModelsResponse {models:[{id,name,params:{aspectRatio?{values},seed?{min,max},n?{max}}}], fetchedAt}` · errors: 404, 409 PROVIDER_NOT_CONFIGURED, 502 PROVIDER_ERROR.

— `contracts/openapi.yaml, listProviders + listImageModels, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-03 — happy path

> **Given** the Owner opens the generate form
> **When** the Owner opens the model picker
> **Then** the system lists the models OpenRouter offers for image output (by name and model id), no older than 10 minutes, so the Owner never has to type a model id from memory; after choosing a model, the form offers only the optional parameters (aspect ratio, seed, number of images) that this model is listed as supporting, with the allowed values the provider lists
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-13 — cross-context

> **Given** no OpenRouter key is configured on the server
> **When** the Owner opens the generate form
> **Then** the system tells the Owner that OpenRouter is not configured and how to configure it, and generation is not offered; the gallery of earlier generations stays browsable
>
> — `spec.md §5, AC-13, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — cross-context

> **Given** the provider's model list cannot be loaded (provider down, network off)
> **When** the Owner opens the model picker
> **Then** the system says the model list is unavailable and lets the Owner retry, while the gallery stays browsable
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] zod `ProvidersResponse`, `ImageModel`, `ModelsResponse` in `src/shared/providers.ts`
- [ ] `registerProvidersRoutes(app, deps)`: GET `/providers`, GET `/providers/:providerId/models` with an in-memory cache `{models, fetchedAt}` per provider, TTL 10 min via injected `now()`
- [ ] Unknown provider → 404 NOT_FOUND; not configured → 409 PROVIDER_NOT_CONFIGURED with `details.provider`; ProviderError → 502 PROVIDER_ERROR with `details.provider/upstreamStatus`

## Edge cases

| Case | Behaviour |
|---|---|
| catalog fails after a cached success expired | 502 (no stale fallback) |
| key missing | 409 PROVIDER_NOT_CONFIGURED |

## Definition of Done

- [ ] integration tests via app.request(): providers list shows configured flag; models list maps the fixture, is cached for 10 min (injected clock), 409 when not configured, 502 PROVIDER_ERROR when the catalog fails
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
