---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 2"
---

# 0005 — Run generations as a single-slot server job polled by the UI

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Image generation can take tens of seconds (up to the 180 s timeout, spec §6). Spec AC-17 requires that closing/reloading the page does not cancel the generation, that one click never spends twice (one generation in flight app-wide), and that a failure nobody watched is shown on the next visit until dismissed.

## Decision drivers

- Spec AC-17 (no double spend, survive reload, unwatched-failure notice).
- Spec §6 timeout 180 s — longer than comfortable for a held-open browser request through a dev proxy.
- Single local process (architecture-map) — no queue infrastructure wanted.

## Considered options

1. **In-memory single-slot job + polling** — starting a generation returns at once with a job; the server runs it detached from the request; the UI polls the current job (≈1 s) and can dismiss a failed one; a second start while running is refused.
2. **Hold the request open** — the start request returns only when the generation is saved; a disabled button prevents double clicks.
3. **Server-sent events** — start returns a job; the UI subscribes to a stream of job events.

## Decision outcome

**Chosen:** Option 1. It satisfies AC-17 fully with the least machinery: the slot is server-side (covers reloads and second tabs), and polling a tiny JSON is trivial at one user. Option 2 breaks on reload and allows a second tab to spend twice; option 3 gives the same guarantees as polling with more moving parts (reconnects, proxy buffering).

## Consequences

**Positive**
- Generation work is independent of the browser connection; double spend is impossible by construction.
- Easy to test: start → poll → assert, with a fake provider.

**Negative**
- A running job lives in memory; a process restart forgets it (spec §6 Durability accepts losing an in-flight generation). The last failure notice is persisted to `<data dir>/last-job-failure.json` (written on failure, removed on dismiss or the next start) so AC-17's «until dismissed» survives restarts.
- ≈1 s polling latency on completion; the panel also fetches the current job when it opens and when the window regains focus, so a second tab learns about a running job without submitting.

**Neutral**
- Moving to SSE later changes only the transport; the job model stays.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0006-commit-generations-atomically-via-staging-dir-and-boot-sweep]]
