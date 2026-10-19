---
id: T5
title: "Refresh a pending cost per card instead of the whole gallery"
layer: "ui"
deps: ["T4"]
blocks: []
acs: ["AC-02", "AC-07"]
files_hint: ["src/web/features/gallery/usePendingCost.ts", "src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/PendingCost.test.tsx", "src/web/features/generate/RecentGenerations.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "M"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T5 — Refresh a pending cost per card instead of the whole gallery

## Place in the sequence

- **Blocked by:** T4 — Load pages as the Owner scrolls and keep the place on return · **Blocks:** — · **Wave:** 4 — same file.
- **Lane:** shares `Gallery.tsx` — serialized.

## Why (user story)

> **As an** Owner
> **I want** each gallery card to show the generation's cost, duration and image size over its preview
> **So that** I can compare generations without opening them
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** the grid to stay complete, in order and without duplicates while I browse and generate
> **So that** what I see is exactly my generations, newest first
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task keeps pending cards current without re-reading every loaded page.

## Inlined context

> `useQuery(["generation", id], { refetchInterval: pending ? 10 s : false, staleTime: ∞, refetchOnWindowFocus: false })` per pending card (no request on mount or focus beyond the 10 s poll); on resolve `setQueryData` patches the card in the gallery's pages (exact key) — no invalidation, so the recent strip makes no request (app-shell §6)
>
> — `sad.md §8, Pending refresh, verbatim` · full text: [sad.md](../sad.md)

> One small query per pending card on the existing detail read …; when it resolves, patch that card in the loaded pages — the list query itself stops polling.
>
> — `adr/0031, option 1, abridged` · full text: [adr/0031-refresh-pending-costs-per-generation-instead-of-refetching-every-loaded-page.md](../adr/0031-refresh-pending-costs-per-generation-instead-of-refetching-every-loaded-page.md)

> Keeping loaded cards current | a pending cost is refreshed by asking only for the generations still pending — not every loaded page — at most every 10 s; other refreshes cost ≤ 1 request per loaded page | component test counting list/detail requests with 5 pages loaded
>
> — `spec.md §6, row 3, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /api/generations/{id}` (existing) per pending card every 10 s.

## Acceptance criteria

### AC-02 (US-01) — domain invariant

> **Given** a generation's cost is pending or unavailable
> **When** its card is shown
> **Then** the cost badge says «cost pending» or «cost unavailable» — never $0 — and a pending cost changes to the recorded amount on the card once it is known, without a reload
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-07 (US-03) — cross-context

> **Given** the ten latest generations are also shown next to the generate form (app-shell, recent generations)
> **When** the Owner scrolls the gallery or the gallery loads more pages
> **Then** the recent strip still shows exactly the ten latest generations, and a new generation appears first in both; refreshing a pending cost on a gallery card makes no request for the recent strip, which still refreshes only when a generation finishes, is deleted or is curated (app-shell)
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `usePendingCost(summary)` — `usePendingCost.ts`
- [ ] remove the list `refetchInterval`; use the hook in pending tiles — `Gallery.tsx`
- [ ] tests (fake timers): with 5 pages loaded and one pending card, only that generation is read every 10 s, no list request; card updates to the amount; recent strip makes no request — `PendingCost.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| pending → unavailable | card says «cost unavailable», polling stops |
| two pending cards | each polls its own generation |
| card scrolls out / unmounts | its polling stops |

## Definition of Done

- [ ] pending tests pass; existing PendingCost tests migrated
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
