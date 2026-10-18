---
id: T10
title: "Verify the curation and deletion NFRs"
layer: "tests"
deps: ["T6"]
blocks: []
acs: ["AC-09"]
files_hint: ["src/server/modules/generations/nfr.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T10 — Verify the curation and deletion NFRs

## Place in the sequence

- **Blocked by:** T6 — Expose the curation and delete routes and add tags/comment to the DTOs · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to delete a generation after confirming it
> **So that** unwanted results and their files are gone from my machine
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: verify the curation and deletion NFRs.

## Inlined context

> | Comment / tag save | ≤ 100 ms p95 server time | … | Delete (record + up to 4 outputs + 8 input copies) | ≤ 300 ms p95 server time | … | Gallery first page (24 items, 1 000 generations, each with 10 tags and a comment) | ≤ 300 ms p95 server time (unchanged from step 2) | … | Deletion durability | 0 half-deleted generations after a crash/kill mid-delete … |
>
> — `spec.md §6, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Exercises the curation routes through `app.request()`.

## Acceptance criteria

### AC-09 — domain invariant

> **Given** the Owner confirmed a deletion but removing the generation's files fails part-way, or gen-img stops in the middle of it
> **When** gen-img continues or starts again
> **Then** the deletion is all-or-nothing: either the generation is fully present (record, comment, tags, every image openable) and the Owner is told the deletion failed and why, or it is fully gone — never a gallery entry with missing images, never images of a deleted generation still openable
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] Seed via `seedGeneration` with tags/comment; time 20 runs each; assert p95
- [ ] Simulate a leftover `.staging/<id>.deleted` and restart

## Edge cases

| Case | Behaviour |
|---|---|
| CI-less laptop | server time measured in-process |

## Definition of Done

- [ ] NFR tests in the serial nfr project (files named `nfr.int.test.ts`): comment/tag save ≤ 100 ms p95; delete with 4 outputs + 8 inputs ≤ 300 ms p95 and the dir is gone; gallery first page ≤ 300 ms p95 with 1 000 generations × 10 tags + comment; restart after a commit-before-purge crash leaves no trash
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
