---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: ""
ticket: ""
---

# 0002 — Organize the server as a modular monolith with an `ImageProvider` port per call path

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (owner), survey foundation session

## Context

The weakest point of the idea (brief §6 risk 1) is provider heterogeneity: OpenRouter exposes
`POST /api/v1/images` with `input_references`; Vercel AI Gateway has `/v1/images/generations` +
`/v1/images/edits` for image-only models and chat completions with `modalities` for multimodal LLMs;
support for input images, `seed`, `size`/`aspect_ratio`, `n` is model-dependent, and Vercel cost
arrives asynchronously. Both providers ship in v1, so the code structure must contain this variety
without leaking it into the gallery/generation logic.

## Decision drivers

- ≥3 provider call paths from v1 with different request/response shapes (brief §5, §6).
- Metadata must record what each model actually accepted, normalised across providers (brief §7).
- A mini project — no microservices, no monorepo overhead.
- Testability without real API keys — providers must be replaceable by fakes/fixtures.

## Considered options

1. **Modular monolith (one package, `src/server/modules/<module>/`) with an `ImageProvider` port and one adapter per call path, dependencies injected via `createApp(deps)`** — provider differences live only in adapters.
2. **Flat route handlers calling provider APIs directly** — fastest start, but provider branching spreads into every handler and tests need network stubs everywhere.
3. **Full hexagonal layering for every module (domain/app/infra/ports everywhere)** — maximal isolation, but ceremony out of proportion to a single-user tool.

## Decision outcome

**Chosen:** Option 1. A port is used exactly where variation lives (providers); other modules stay
lightweight (`routes` / `service` / `repo` / `domain` as needed). Explicit dependency injection
through `createApp(deps)` lets integration tests swap in recorded-fixture providers and a temp data
dir.

## Consequences

**Positive**
- Adding/changing a provider or call path touches one adapter + the registry, never `generations`.
- Normalised `GenerationResult` (images, accepted params, cost or `pending`, raw request/response) is defined once in the port.
- Tests run offline with fixture-backed adapters.

**Negative**
- The port must be designed to cover all three paths up front; an awkward shape costs adapter rewrites.
- DI by hand (no container) means `createApp` grows as modules are added.

**Neutral**
- Splitting into packages/processes later is possible along module boundaries, but not planned.

## Links

- Idea brief: [[../idea-brief.md]] §6 (risk 1), §7
- Architecture map: [[../architecture-map.md]] §Module inventory, §Conventions
- Related ADR: [[0001-use-typescript-node-hono-react-stack]], [[0003-store-metadata-in-sqlite-and-images-on-disk]]
