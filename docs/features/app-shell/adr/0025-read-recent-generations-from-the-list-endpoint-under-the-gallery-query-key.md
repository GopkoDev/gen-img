---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 8 (amendment)"
---

# 0025 — Read recent generations from the list endpoint under the gallery's query key

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect; answers delegated to Claude in the design pass)

## Context

The Generate page gains a panel with the ten latest generations (spec AC-13…AC-15). It must refresh when a generation finishes or is deleted (AC-14) and make at most one request of ten per change (spec §6). The generations list endpoint already accepts `limit` (1–100, default 24) and returns summaries with a thumbnail (the first output image), newest first.

## Decision drivers

- No API change if avoidable (the contract already has `limit`).
- Every change that affects the gallery already invalidates the gallery's query key `["generations"]` (job success, delete, curation).
- ADR-0023: revisits reload nothing.

## Considered options

1. **The list endpoint with `limit=10`, query key `["generations", "recent"]`** — a prefix-match child of the gallery key, so every existing invalidation refreshes it too; `staleTime: ∞` + refetch on focus like the gallery.
2. **Reuse the gallery's loaded first page** — no request, but the gallery may never have been opened, and its page holds 24.
3. **A dedicated «recent» endpoint** — same data as option 1 with more surface.

## Decision outcome

**Chosen:** Option 1. Zero server change, zero new invalidation wiring; the strip lives and refreshes exactly like the gallery. Option 2 couples the strip to whether the gallery was visited. Option 3 duplicates an existing contract.

## Consequences

**Positive**
- One request of ten per change; stays consistent with the gallery by construction.

**Negative**
- Pending costs aren't polled by the strip (it shows no cost) — not needed.

**Neutral**
- The web client gains a `limit` argument on `api.generations`.

## Links

- Spec: [[../spec.md]] AC-13…AC-15
- SAD: [[../sad.md]] §4, §8
- Related ADR: [ADR-0023](./0023-keep-the-generate-page-mounted-and-apply-address-carried-drafts-on-every-arrival.md)
