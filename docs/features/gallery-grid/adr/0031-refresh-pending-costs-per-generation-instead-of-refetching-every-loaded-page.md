---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 11"
---

# 0031 — Refresh pending costs per generation instead of refetching every loaded page

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The gallery keeps every loaded page under one query and re-reads the whole query every 10 s while any loaded card's cost is pending; a pending cost can last up to ten minutes (ADR-0013). With pages now loading by themselves as the Owner scrolls, «many pages loaded» becomes normal, so one pending card means a re-read of every page every 10 s (devil's-advocate pass, spec §6 «Keeping loaded cards current»).

## Decision drivers

- Spec §6: a pending cost is refreshed by asking only for the generations still pending, at most every 10 s.
- Spec AC-02: the card changes to the amount once known, without a reload.
- No new endpoint if an existing one already answers a generation's cost (the detail read does).

## Considered options

1. **One small query per pending card on the existing detail read (`["generation", id]`, every 10 s while pending); when it resolves, patch that card in the loaded pages** — the list query itself stops polling.
2. **Refetch only the first page while anything is pending** — pending generations are usually the newest, but not always (a re-run of an old one is still new; a pending one can scroll past page 1 during ten minutes of generating).
3. **A new «summaries by ids» read for the pending ids** — one request per 10 s regardless of how many are pending; a new contract for a case that rarely has more than one id.

## Decision outcome

**Chosen:** Option 1. Pending costs are rare and short-lived — usually one card — so per-card polling is cheaper than any page re-read, reuses the detail read (and its cache, so opening that card shows the fresh cost too), and needs no new contract. Option 2 can miss a pending card beyond page 1; option 3 adds an endpoint to save requests in a case that hardly occurs.

## Consequences

**Positive**
- Refresh cost no longer grows with scroll depth.
- The card and the detail page share one cached answer.

**Negative**
- Several pending cards poll separately (bounded by how many are pending; each ≤ 1 request per 10 s).

**Neutral**
- Other refreshes (focus, invalidation after a change) still re-read loaded pages — ≤ 1 request per page (spec §6).

## Links

- Spec: [[../spec.md]] AC-02, §6
- SAD: [[../sad.md]] §4, §8
- Related ADR: ADR-0013 (deferred cost lookup), ADR-0025 (recent generations share the gallery key)
