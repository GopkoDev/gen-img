---
id: T5
title: "Curate and delete generations in the service without disturbing running work"
layer: "app"
deps: ["T3", "T4"]
blocks: ["T6"]
acs: ["AC-01", "AC-02", "AC-04", "AC-08", "AC-09", "AC-10", "AC-11", "AC-12", "AC-14"]
files_hint: ["src/server/modules/generations/service.ts", "src/server/modules/generations/cost-sync.ts", "src/server/modules/generations/jobs.ts", "src/server/modules/generations/curation.int.test.ts", "src/server/app.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "done"
step: "COMMIT"
---

# T5 — Curate and delete generations in the service without disturbing running work

## Place in the sequence

- **Blocked by:** T3 — Add comment, tag and atomic-delete queries to the generations repo, T4 — Let the file store move a generation into staging and purge it · **Blocks:** T6 — Expose the curation and delete routes and add tags/comment to the DTOs.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** curating to never break a running generation, a cost still being looked up, or the generate panel
> **So that** I can tidy up while I keep generating
>
> — `spec.md §4, US-05, verbatim` · full text: [spec.md](../spec.md)

This task delivers: curate and delete generations in the service without disturbing running work.

## Inlined context

> Rows + rename-to-staging in one transaction, then purge — `DELETE` the generation (children cascade), then as the transaction's last step `renameSync(generations/<id>, .staging/<id>.deleted)`; a failed rename rolls back; after commit `rm -rf` the staged dir; a crash before purge leaves it in `.staging`, which the boot sweep empties. … a missing source directory is treated as «nothing to move», not as a failure.
>
> — `adr/0014, option 1 + Negative, abridged` · full text: [ADR-0014](../adr/0014-delete-generations-atomically-by-moving-their-directory-to-staging-inside-the-delete-transaction.md)

> Per-tag add/remove + whole-comment replace — add one tag (server normalizes, dedups, enforces 10, returns the full list); remove one tag by its normalized value; set the comment to a text (empty removes it).
>
> — `adr/0016, option 1, verbatim` · full text: [ADR-0016](../adr/0016-change-tags-one-at-a-time-and-replace-the-comment-whole.md)

> Deletion tells its neighbours — the service cancels the generation's pending cost lookup (ADR-0013) and forgets it as the job slot's latest result; the UI invalidates the gallery and job queries.
>
> — `sad.md §4, choice 4, verbatim` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generation_comments.generation_id` | TEXT | PK, FK → generations ON DELETE CASCADE | read + write (via repo) |
| `generation_comments.body` / `updated_at` | TEXT / TEXT | non-blank, ≤ 2 000 chars / ISO-8601 UTC | read + write (via repo) |
| `generation_tags.(generation_id, tag)` | TEXT, TEXT | PK; FK → generations ON DELETE CASCADE; tag 1–32, trimmed, lower-case | read + write (via repo) |
| `generation_tags.position` | INTEGER | ≥ 1, insertion order | read + write (via repo) |

— `data-model.md §Entities, abridged` · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-01 — happy path

> **Given** the Owner is on a generation's detail view
> **When** the Owner writes a comment and saves it
> **Then** the comment is shown on the detail view exactly as written (line breaks kept) and is still there after a reload; saving an edited text replaces it, and saving an empty or whitespace-only text removes it. The comment is saved only by an explicit Save (Cancel drops the edit); if it was changed in another tab meanwhile, the last save wins
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-02 — happy path

> **Given** the Owner is on a generation's detail view
> **When** the Owner adds a tag and later removes it
> **Then** each add or remove is saved at once (no separate Save step); the tag appears on the detail view and on the generation's gallery tile, and after removal disappears from both; tags keep the order they were added in, and the change survives a reload
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-04 — happy path

> **Given** the Owner is on a generation's detail view (the only place deletion is offered)
> **When** the Owner chooses delete and confirms in the confirmation dialog, which names the generation by its prompt excerpt and says that its images will be removed for good
> **Then** the generation disappears from the gallery, its images (outputs and input copies) can no longer be opened, the Owner lands back on the gallery with a short «deleted» notice, and its files no longer take space on the machine; other open gen-img tabs drop it from their gallery the next time they are focused, and its detail view there says it no longer exists (AC-14)
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — domain invariant

> **Given** a generation already has 10 tags, or already has a tag that matches the new one ignoring case and surrounding spaces
> **When** the Owner adds a tag
> **Then** the system keeps the invariant «a generation holds each tag once, at most 10»: an 11th tag is refused with the reason, and a duplicate is not added twice (tags are stored trimmed, lower-case, inner spaces collapsed)
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-09 — domain invariant

> **Given** the Owner confirmed a deletion but removing the generation's files fails part-way, or gen-img stops in the middle of it
> **When** gen-img continues or starts again
> **Then** the deletion is all-or-nothing: either the generation is fully present (record, comment, tags, every image openable) and the Owner is told the deletion failed and why, or it is fully gone — never a gallery entry with missing images, never images of a deleted generation still openable
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — cross-context

> **Given** a generation whose cost status is still «pending»
> **When** the Owner deletes it
> **Then** gen-img stops looking up its price; no later price lookup brings it back or fails because it is gone
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — cross-context

> **Given** a generation is running
> **When** the Owner comments on, tags or deletes another, already saved generation
> **Then** the running generation continues and is saved normally, and the generate panel still shows its progress; a generation that is still running is not in the gallery and cannot be deleted
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

### AC-12 — cross-context

> **Given** the generate panel shows a just-saved generation as the latest result
> **When** the Owner deletes that generation
> **Then** the generate panel stops showing it as the latest result (no broken image or link to a missing generation)
>
> — `spec.md §5, AC-12, verbatim` · full text: [spec.md](../spec.md)

### AC-14 — error

> **Given** a generation was already deleted (for example in another tab)
> **When** the Owner tries to comment on, tag or delete it again
> **Then** the system tells the Owner the generation no longer exists and offers the way back to the gallery; nothing else changes
>
> — `spec.md §5, AC-14, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `setComment(id, raw)` → checkComment → repo; `addTag(id, raw)` → normalizeTag → repo (limit → field error «A generation can have at most 10 tags»); `removeTag(id, raw)`
- [ ] `deleteGeneration(id)`: `repo.deleteAtomic(id, () => files.trashSync(id))` (false → NOT_FOUND; throw → STORAGE_ERROR «The generation could not be deleted: …»); then `files.purge(id)` (log on error), `costSync.forget(id)`, `jobs.forgetGeneration(id)`
- [ ] `cost-sync.forget(id)` cancels a scheduled lookup; `jobs.forgetGeneration(id)` clears a succeeded state with that generationId
- [ ] Wire `costSync` (forget) into the service deps in `src/server/app.ts`

## Edge cases

| Case | Behaviour |
|---|---|
| delete while another generation runs | running job unaffected, saves normally |
| delete the latest succeeded result | job slot shows none |
| delete with pending cost | no lookup fires afterwards |

## Definition of Done

- [ ] service integration tests: comment/tag rules map to VALIDATION_ERROR fields and NOT_FOUND; delete removes rows + dir (purged), failing move → STORAGE_ERROR with generation intact, pending cost lookup cancelled (no lookup after delete), succeeded job pointing at it forgotten, a held running job still saves after deleting another generation
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
