---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 2"
---

# 0004 — Return a normalized generation result from the ImageProvider port

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

ADR-0002 fixed a provider port but not its shape. This slice builds the first adapter (OpenRouter Image API), and step 4 adds Vercel's two call paths. `generations` must store images, cost, requested/accepted parameters and the raw exchange (spec AC-02, AC-07, AC-09, AC-16) without branching on provider.

## Decision drivers

- Spec §2 Goal 3: the second provider is an addition, not a rewrite.
- Spec AC-06/AC-16: «usable image» is decided once, consistently, regardless of provider.
- Spec §6: 0 bytes of image payload in the stored raw response; key never stored (AC-10).

## Considered options

1. **Normalized result** — `generate(input, signal)` returns `{ images: {bytes, mediaType, width, height}[], costMicros: number|null, acceptedParams: Record|null, rawRequest, rawResponse }` with images already decoded/validated and the raw exchange already redacted; failures throw `ProviderError {provider, upstreamStatus, message}`.
2. **Adapter persists its own output** — the adapter decodes and writes image files through `storage` and returns file references + metadata; `generations` only inserts rows.
3. **Streaming port** — the adapter yields partial images/events, `generations` assembles them.

## Decision outcome

**Chosen:** Option 1. It keeps every provider difference inside the adapter (Goal 3) and lets `generations` enforce «≥1 usable image» and all-or-nothing saving on one shape. Option 2 splits the all-or-nothing save (ADR-0006) across every adapter, so each provider would re-implement staging and cleanup; option 3 adds complexity no AC needs (no partial previews in scope).

## Consequences

**Positive**
- `generations` and its tests are provider-agnostic; fixture-backed fakes implement one small interface.
- Redaction and image sniffing happen once per adapter, close to the provider format.

**Negative**
- Image bytes are held in memory until saved (≤ 4 × 5 MB per spec §6 — acceptable).
- Adapters must each implement redaction; a shared helper mitigates.

**Neutral**
- Adding a streaming path later means a second port method, not a breaking change.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0008-redact-secrets-and-image-payloads-from-the-stored-raw-exchange]], [ADR-0002](../../../adr/0002-organize-as-modular-monolith-with-provider-port.md)
