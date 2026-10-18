---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 2"
---

# 0008 — Redact secrets and image payloads from the stored raw exchange

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Spec AC-02 shows the raw request/response; AC-10 forbids the key anywhere the browser can see or in stored metadata; spec §6 demands 0 bytes of embedded image payload in the stored raw response (each image is already a file).

## Decision drivers

- Spec AC-10, §6.1 key-leak abuse case.
- Spec §6 raw-response size row; ADR-0003 (images never in the DB).

## Considered options

1. **Adapter stores a redacted exchange** — the raw request is recorded as method + URL + JSON body + headers without `Authorization`; in the raw response every `b64_json` value is replaced with `{"$file": "<relative path>"}` once paths are known (generations fills the placeholders `{"$image": N}` the adapter left).
2. **Redact centrally in `generations`** — adapters return the exchange as-is (with the key header and base64), and one generic redactor in `generations` strips known credential headers and replaces any `b64_json`-like field.
3. **Store the raw response as a sidecar file** — keep the redacted request in the DB, but write the response (with base64) as `raw-response.json` next to the images instead of a DB column.

## Decision outcome

**Chosen:** Option 1. The adapter is the only code that knows where its provider puts credentials and image payloads, so it redacts precisely, and the secret never leaves it. Option 2 needs a generic «guess the secret fields» redactor that a new provider's format can silently defeat; option 3 still stores every image twice on disk (spec §6 asks for references, not duplicate payloads).

## Consequences

**Positive**
- A copied DB file or screenshot can't leak the key; DB size scales with metadata, not images.

**Negative**
- The stored «raw» response is not byte-identical to what arrived (documented in the detail view label).

**Neutral**
- Each new adapter must apply the same redaction helper.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §8
- Related ADR: [[0004-return-a-normalized-generation-result-from-the-image-provider-port]]
