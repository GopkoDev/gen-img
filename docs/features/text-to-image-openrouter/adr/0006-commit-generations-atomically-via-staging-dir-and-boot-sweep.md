---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 2"
---

# 0006 — Commit generations atomically via a staging dir and a boot sweep

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

ADR-0003 splits a generation across two stores: rows in SQLite, image files on disk. CONTEXT.md's invariant and spec AC-08 / §6 Durability require all-or-nothing: no record without files, no files without a record, even after a crash mid-save.

## Decision drivers

- Spec AC-08 + §6 Durability («0 half-saved generations … leftover partial files are cleaned up on start»).
- Spec §6 local overhead ≤ 500 ms p95 for 4 × 5 MB.
- Two stores cannot share one transaction.

## Considered options

1. **Staging dir + DB transaction + rename + boot sweep** — write files to `<data>/.staging/<id>/`; in one SQLite transaction insert the rows and, as its last step, rename the staging dir to `<data>/generations/<id>/`; a failed rename aborts the transaction; on boot delete `.staging/*` and any `generations/<id>/` without a row.
2. **Rows first with a `status` column** — insert rows as `saving`, write files, flip to `saved`; the gallery hides `saving`; boot sweep deletes stale `saving` rows + files.
3. **Files straight into place, then rows** — no staging; boot sweep removes directories without rows.

## Decision outcome

**Chosen:** Option 1. A same-filesystem directory rename is atomic, so the gallery never sees partial files. The rename is synchronous (`renameSync`) because the SQLite transaction is synchronous; if anything throws after the rename (including COMMIT), the moved dir is removed before the error propagates, and the only remaining window — a process crash between rename and commit — leaves an orphan dir the boot sweep removes. The file route serves only paths recorded in `generation_images`, so an orphan dir is never reachable. Option 2 pollutes every query with a status filter; option 3 exposes half-written files to the file route during the save.

## Consequences

**Positive**
- Gallery and file route only ever see complete generations; no status column in queries.
- The sweep is simple and idempotent.

**Negative**
- Boot does a directory listing of `generations/` (cheap at the expected scale of thousands).
- Staging must be on the same filesystem as `generations/` (both under the data dir — guaranteed).

**Neutral**
- Later features that add files to a generation (step 3 input images) reuse the same staging step.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0005-run-generations-as-a-single-slot-server-job-polled-by-the-ui]], [ADR-0003](../../../adr/0003-store-metadata-in-sqlite-and-images-on-disk.md)
