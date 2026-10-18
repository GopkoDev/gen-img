---
id: T4
title: "Let the file store move a generation into staging and purge it"
layer: "infra"
deps: []
blocks: ["T5"]
acs: ["AC-09"]
files_hint: ["src/server/modules/storage/file-store.ts", "src/server/modules/storage/file-store.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T4 — Let the file store move a generation into staging and purge it

## Place in the sequence

- **Blocked by:** — · **Blocks:** T5 — Curate and delete generations in the service without disturbing running work.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to delete a generation after confirming it
> **So that** unwanted results and their files are gone from my machine
>
> — `spec.md §4, US-04, verbatim` · full text: [spec.md](../spec.md)

This task delivers: let the file store move a generation into staging and purge it.

## Inlined context

> Rows + rename-to-staging in one transaction, then purge — `DELETE` the generation (children cascade), then as the transaction's last step `renameSync(generations/<id>, .staging/<id>.deleted)`; a failed rename rolls back; after commit `rm -rf` the staged dir; a crash before purge leaves it in `.staging`, which the boot sweep empties. … a missing source directory is treated as «nothing to move», not as a failure.
>
> — `adr/0014, option 1 + Negative, abridged` · full text: [ADR-0014](../adr/0014-delete-generations-atomically-by-moving-their-directory-to-staging-inside-the-delete-transaction.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-09 — domain invariant

> **Given** the Owner confirmed a deletion but removing the generation's files fails part-way, or gen-img stops in the middle of it
> **When** gen-img continues or starts again
> **Then** the deletion is all-or-nothing: either the generation is fully present (record, comment, tags, every image openable) and the Owner is told the deletion failed and why, or it is fully gone — never a gallery entry with missing images, never images of a deleted generation still openable
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `trashSync(id)`: if `generations/<id>` exists → `renameSync` to `.staging/<id>.deleted` (remove a stale target first); missing → no-op
- [ ] `purge(id)`: `rmSync(.staging/<id>.deleted, {recursive, force})`, errors logged by the caller
- [ ] Tests incl. a read-only parent to force a failing move

## Edge cases

| Case | Behaviour |
|---|---|
| dir missing (corrupt state) | no-op, deletion proceeds |
| rename fails | throws — caller's transaction rolls back |

## Definition of Done

- [ ] integration tests: trashSync moves generations/<id> to .staging/<id>.deleted (sync), is a no-op when the dir is missing, throws when the move fails; purge removes the trash dir; sweep removes leftover trash dirs
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
