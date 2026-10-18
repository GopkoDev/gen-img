---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 5"
---

# 0014 — Delete generations atomically by moving their directory to staging inside the delete transaction

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Deletion is the first destructive action. A generation is spread over SQLite rows (generation, images, inputs, comment, tags) and one directory `generations/<id>/`. Spec AC-09 and the CONTEXT invariant require all-or-nothing: never a gallery entry with missing images, never files of a deleted generation still reachable — also across a crash.

## Decision drivers

- Spec AC-09, §6 «Deletion durability» and «Disk reclaimed».
- ADR-0006 already gives a staging dir that the boot sweep empties, and a file route that serves only recorded paths.
- Synchronous SQLite transactions (better-sqlite3) can run a synchronous filesystem step as their last statement.

## Considered options

1. **Rows + rename-to-staging in one transaction, then purge** — `DELETE` the generation (children cascade), then as the transaction's last step `renameSync(generations/<id>, .staging/<id>.deleted)`; a failed rename rolls back; after commit `rm -rf` the staged dir; a crash before purge leaves it in `.staging`, which the boot sweep empties.
2. **Delete rows, then remove the directory** — commit the row deletion, then `rm -rf generations/<id>`; a crash or failure leaves an orphan directory the boot sweep removes later.
3. **Soft delete** — mark the generation deleted, hide it, purge rows and files later in the background.

## Decision outcome

**Chosen:** Option 1. It is the mirror of the save path (ADR-0006): the gallery and the file route switch atomically, a failure leaves the generation fully intact (and the Owner is told), and no new background process is needed. Option 2 leaves files of a deleted generation on disk under their live name until the next start — unreachable, but they still count against «disk reclaimed» and the invariant. Option 3 adds a hidden state every query must filter, for an undo the spec rules out.

## Consequences

**Positive**
- Deletion and saving share one mental model and one clean-up mechanism (boot sweep of `.staging`).
- After commit the deleted files are no longer under `generations/`, so nothing can serve them even before the purge.

**Negative**
- A generation whose directory is already missing (corrupt state) must still be deletable: a missing source directory is treated as «nothing to move», not as a failure.
- Purge failures after commit only log; the files wait in `.staging` until the next start.
- The move happens before COMMIT, so a rolled-back deletion (failed COMMIT, crash) leaves a recorded generation's files in staging. The service restores them on failure, and the boot sweep returns any `.staging/<id>.deleted` whose row still exists before clearing staging — added after the independent review found the images could otherwise be lost.

**Neutral**
- The service also cancels the generation's pending cost lookup and forgets it as the job slot's latest result (SAD §4, choice 4) — outside the transaction, both idempotent.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [ADR-0006](../../text-to-image-openrouter/adr/0006-commit-generations-atomically-via-staging-dir-and-boot-sweep.md), [ADR-0013](../../vercel-ai-gateway/adr/0013-resolve-deferred-costs-with-a-bounded-db-driven-background-lookup.md)
