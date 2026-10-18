---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 4"
---

# 0013 — Resolve deferred costs with a bounded, DB-driven background lookup

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Vercel states a generation's price only through a later lookup (`GET /v1/generation?id=`) that answers «not found» for a few seconds after the generation. Spec AC-05…AC-07 require saving immediately with cost `pending`, resolving to `known` or `unavailable` within 10 minutes, surviving restarts, and never staying `pending` forever. The single-slot job (ADR-0005) and the atomic save (ADR-0006) must not wait for the price.

## Decision drivers

- Spec AC-05/AC-06/AC-07; spec §6 lookup bounds (≤ 8 lookups, 5 s → 60 s backoff, 10 min deadline).
- ADR-0005: the job slot must free as soon as images are saved.
- ADR-0002/0004: `generations` must stay provider-agnostic.

## Considered options

1. **Optional port capability + DB-driven resolver** — `GenerationResult.costRef` and `ImageProvider.lookupCost(ref)`; `generations` saves `pending` with `cost_ref`, and a `cost-sync` component schedules bounded lookups in-process; on boot it re-reads every `pending` row and resumes (overdue rows get one final lookup).
2. **Wait for the price inside the job** — keep the job running and poll the lookup before saving.
3. **Persistent job queue table** — a `cost_lookups` table with attempts/next-run columns, polled by a worker loop.

## Decision outcome

**Chosen:** Option 1. The generation row already holds everything needed (`cost_status`, `cost_ref`, answer time = `created_at` + `duration_ms`), so the DB is the queue and a restart loses nothing. Option 2 blocks the slot for up to 10 minutes and delays the gallery; option 3 adds a second table and a polling loop for what a few timers do at one user's scale.

## Consequences

**Positive**
- Saving and the job slot are untouched; the price arrives independently.
- Provider-agnostic: any adapter can opt in with `lookupCost`; adapters without it never produce `pending`.

**Negative**
- Timers are in-process; during downtime no lookup happens (boot resume covers it).
- The attempt counter is not persisted: after a restart a young row gets a fresh schedule, still capped by the 10-minute deadline.

**Neutral**
- Moving to a persistent queue later only replaces `cost-sync`.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4, §6, §8
- Related ADR: [ADR-0005](../../text-to-image-openrouter/adr/0005-run-generations-as-a-single-slot-server-job-polled-by-the-ui.md), [ADR-0006](../../text-to-image-openrouter/adr/0006-commit-generations-atomically-via-staging-dir-and-boot-sweep.md)
