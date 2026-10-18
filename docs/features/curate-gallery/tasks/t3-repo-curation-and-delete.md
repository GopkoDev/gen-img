---
id: T3
title: "Add comment, tag and atomic-delete queries to the generations repo"
layer: "infra"
deps: ["T1", "T2"]
blocks: ["T5"]
acs: ["AC-01", "AC-02", "AC-03", "AC-08", "AC-09"]
files_hint: ["src/server/modules/generations/repo.ts", "src/server/modules/generations/repo.int.test.ts", "tests/helpers/generations.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

# T3 — Add comment, tag and atomic-delete queries to the generations repo

## Place in the sequence

- **Blocked by:** T1 — Promote the curation migration, T2 — Implement the shared tag and comment rules · **Blocks:** T5 — Curate and delete generations in the service without disturbing running work.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** to write, change or clear one note on a generation
> **So that** I remember why it matters or what to try next
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: add comment, tag and atomic-delete queries to the generations repo.

## Inlined context

> Rows + rename-to-staging in one transaction, then purge — `DELETE` the generation (children cascade), then as the transaction's last step `renameSync(generations/<id>, .staging/<id>.deleted)`; a failed rename rolls back; after commit `rm -rf` the staged dir; a crash before purge leaves it in `.staging`, which the boot sweep empties. … a missing source directory is treated as «nothing to move», not as a failure.
>
> — `adr/0014, option 1 + Negative, abridged` · full text: [ADR-0014](../adr/0014-delete-generations-atomically-by-moving-their-directory-to-staging-inside-the-delete-transaction.md)

> **Access patterns:** tags of one generation ordered by position (detail); tags of a gallery page (`WHERE generation_id IN (…) ORDER BY generation_id, position`); count per generation for the 10-tag limit → all PK prefix. **Constraints:** «at most 10 per generation» enforced by the service inside the insert transaction (ADR-0015).
>
> — `data-model.md §generation_tags, verbatim` · full text: [data-model.md](../data-model.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column | Type | Constraints | Change |
|---|---|---|---|
| `generation_comments.generation_id` | TEXT | PK, FK → generations ON DELETE CASCADE | read + write |
| `generation_comments.body` / `updated_at` | TEXT / TEXT | non-blank, ≤ 2 000 chars / ISO-8601 UTC | read + write |
| `generation_tags.(generation_id, tag)` | TEXT, TEXT | PK; FK → generations ON DELETE CASCADE; tag 1–32, trimmed, lower-case | read + write |
| `generation_tags.position` | INTEGER | ≥ 1, insertion order | read + write |

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

### AC-03 — happy path

> **Given** generations with tags and comments exist
> **When** the Owner opens the gallery and a detail view
> **Then** each tile shows its first 3 tags (with «+N» for the rest) and the detail view shows all tags and the full comment; a tile shows a small marker when a comment exists
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

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

## Checklist

- [ ] `setComment(id, body|null, now)` upsert/delete; `getComment(id)`
- [ ] `addTag(id, tag)` in a transaction: exists? count < 10? insert with position max+1 → returns `{status:'added'|'duplicate'|'limit'|'missing', tags}`; `removeTag(id, tag)`; `tagsOf(ids[])`
- [ ] `listPage` adds `tags` (first ≤ 10 in order) and `hasComment` via one `IN (…)` query each; `get` adds `comment`, `tags`
- [ ] `deleteAtomic(id, moveFiles)` → `db.transaction(() => { changes = DELETE …; if 0 → false; moveFiles(); return true })`
- [ ] Extend `seedGeneration` with `comment`, `tags`

## Edge cases

| Case | Behaviour |
|---|---|
| add tag to a missing generation | status missing, nothing inserted |
| moveFiles throws | transaction rolls back — rows intact |
| delete missing id | returns false, moveFiles not called |

## Definition of Done

- [ ] integration tests: set/replace/remove comment; add tags in order, dedup, refuse the 11th inside one transaction; remove tag; page summaries carry tags + hasComment; detail carries comment + tags; deleteAtomic removes rows (cascades) and rolls back when moveFiles throws; seedGeneration accepts comment/tags
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
