---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 13"
---

# 0036 — Read the models with counts and their latest cards in one request

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The model choice needs every provider + model the Owner generated with, its count and recency; «By model» needs the same plus each model's latest four cards (spec AC-01, AC-02). The list query has no filter and there is no index on provider + model, so a per-model page scans `generations` (devil's-advocate pass).

## Decision drivers

- Spec §6: filtered page and model groups ≤ 300 ms p95 server time with 1 000 generations across 30 models.
- Spec AC-05: counts exact; «Show all N» shows N.
- CLAUDE.md: hand-written SQL, rows parsed through zod.

## Considered options

1. **A new index `generations (provider, model, id)`; the list read takes an optional provider + model filter (`WHERE provider = ? AND model = ?` + the id cursor); one models read `GROUP BY provider, model` with `count(*)` and `max(id)`, ordered by `max(id) DESC`, with each model's latest N summaries (N ≤ 4) read server-side through the same filtered page query (one grouped query plus one indexed page read per model, all in one request).**
2. **The browser asks the filtered list once per model for «By model»** — 30 requests per view, and counts taken from separate answers can disagree with each other after a change.
3. **Keep per-model counts in a separate table updated on save/delete** — a second source of truth for a number a grouped count answers in milliseconds at this scale.

## Decision outcome

**Chosen:** Option 1. The index serves both the filtered page (provider + model + id order) and the grouping; one read answers the choice and «By model». Option 2 multiplies requests and lets counts drift between answers; option 3 adds write paths that can drift — exactly what AC-05 forbids.

## Consequences

**Positive**
- One request for «By model»; filtered pages use the index.

**Negative**
- One more index to maintain on every insert (negligible for a single user).

**Neutral**
- Step 14 can add a prompt grouping the same way (its own key).

## Links

- Spec: [[../spec.md]] AC-01, AC-02, AC-05, §6
- SAD: [[../sad.md]] §4, §5
- Data model: [[../data-model.md]]
