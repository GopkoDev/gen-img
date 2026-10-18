---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 4"
---

# 0012 — Pick the Vercel call path per model inside one adapter

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Vercel AI Gateway produces images in three ways: image-only models through the OpenAI-compatible images API (`/images/generations`), source-image edits through `/images/edits`, and multimodal language models through chat completions with `modalities`. The Owner should see one provider (spec US-01/US-02), and `generations` must not branch on provider (ADR-0002/0004).

## Decision drivers

- Spec AC-01…AC-04: one experience across model kinds; inputs where the model accepts them.
- ADR-0004: the port returns one normalized result.
- The public catalog states each model's `type`, `tags` and input `modalities` — enough to route.

## Considered options

1. **One adapter, call path chosen per model from the catalog** — the adapter keeps a model-id → kind map from the catalog it lists; `generate` routes: inputs present → edits; else image model → generations; else chat model → chat.
2. **Three registered providers** (`vercel-images`, `vercel-edits`, `vercel-chat`) — each a separate adapter the Owner picks.
3. **Expose the call path as a form option** — the Owner chooses «images API» vs «chat» per request.

## Decision outcome

**Chosen:** Option 1. Routing is a provider detail the catalog already answers; the Owner keeps a single provider and the port stays unchanged. Option 2 leaks gateway internals into the gallery and the provider selector, and splits one key across three «providers»; option 3 asks the Owner a question only the catalog can answer correctly.

## Consequences

**Positive**
- One provider entry, one key, one place to change routing when D5 is answered.
- The redaction and «usable image» rules apply to every path inside one file.

**Negative**
- The adapter needs the catalog before generating; it refreshes it itself when the model is unknown (one extra public request).

**Neutral**
- Splitting into several adapters later is possible without touching `generations`.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [ADR-0004](../../text-to-image-openrouter/adr/0004-return-a-normalized-generation-result-from-the-image-provider-port.md)
