---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Spec — curate-gallery

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/idea-brief.md`](../../idea-brief.md) (§5, §7), [`docs/roadmap.md`](../../roadmap.md) step 5, [`docs/architecture-map.md`](../../architecture-map.md), shipped features [`text-to-image-openrouter`](../text-to-image-openrouter/sad.md), [`image-inputs-openrouter`](../image-inputs-openrouter/sad.md), [`vercel-ai-gateway`](../vercel-ai-gateway/sad.md) — no extra channels.

## 1. Context

The gallery keeps every generation, but the Owner cannot do anything with what it keeps: there is no way to note why a result is good or what to try next, no way to group related results, and no way to get rid of failed experiments, duplicates or images that should not stay on the machine. The idea brief made «comment, tags, delete» part of the MVP gallery actions (idea-brief §7, owner decision); without them the gallery fills with noise and the metadata the Owner cares most about — their own judgment — is missing.

There is no external trigger: generation through both providers is shipped (roadmap steps 2–4), so the gallery is now the place the Owner works in, and curating it is the next step on the roadmap (step 5).

Committed approach: on a generation's detail view the Owner can write one free-text comment, attach a small set of tags, and delete the generation after an explicit confirmation. Comments and tags are shown in the gallery and detail view; deletion removes the generation's record together with every file of it (output images and input copies), all-or-nothing, so nothing of a deleted generation stays reachable or half-present. Search and filtering by tag stay out of v1 (idea-brief §5); tags are shown, not queried.

- Traceability: medium-depth ideation reused the brief (direction already owner-accepted, idea-brief §7); competitive research N/A — internal single-user tool. The failure-mode pass (accidental deletion, crash mid-delete, deleting a generation whose cost is still being looked up or that the generate panel shows as the latest result, last-write-wins comment edits, oversized or unsafe text) shaped AC-07…AC-14 and §6.1. No independent critic subagent could run in this session; the critic pass was done in-thread and is recorded in the review file. Clarify (2026-10-18) ran its ambiguity sweep in-thread too (no subagent available): 7 forks resolved — comment whitespace/line breaks, explicit Save + last-save-wins, tags saved per action and kept in insertion order, deletion only from the detail view with a dialog naming the prompt, character counting, other tabs after a deletion.

## 2. Goals

- The Owner can record their own judgment on any generation and find related generations by eye, without leaving gen-img.
- The Owner can remove unwanted generations completely, with no half-deleted leftovers and no accidental loss.
- Curation never interferes with generating: a running generation, a pending cost or the generate panel keep working while the Owner curates.

## 3. Non-goals

- Search, filtering or sorting the gallery by tag or comment — out of v1 by owner decision (idea-brief §5).
- Undo, trash or restore after deletion — the confirmation step is the safety net; a trash adds a second storage state for little benefit to a single owner.
- Bulk actions (multi-select delete or tag) — one generation at a time keeps the confirmation meaningful; revisit if the gallery grows large.
- Rich-text or threaded comments, comment history — one plain note is what the Owner asked for.
- Re-run, «use as input» and parent→child lineage — roadmap step 6.

## 4. User stories

### US-01: Comment on a generation

**As an** Owner
**I want** to write, change or clear one note on a generation
**So that** I remember why it matters or what to try next

### US-02: Tag a generation

**As an** Owner
**I want** to add and remove short tags on a generation
**So that** I can group related results and recognise them in the gallery

### US-03: See my curation in the gallery

**As an** Owner
**I want** tags on gallery tiles and the comment and tags on the detail view
**So that** my notes are visible where I browse

### US-04: Delete a generation

**As an** Owner
**I want** to delete a generation after confirming it
**So that** unwanted results and their files are gone from my machine

### US-05: Curate safely while gen-img works

**As an** Owner
**I want** curating to never break a running generation, a cost still being looked up, or the generate panel
**So that** I can tidy up while I keep generating

### US-06: Keep curation private to gen-img

**As an** Owner
**I want** only gen-img's own pages to be able to change or delete my generations
**So that** another site in my browser cannot wipe or vandalise my gallery

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the Owner is on a generation's detail view
**When** the Owner writes a comment and saves it
**Then** the comment is shown on the detail view exactly as written (line breaks kept) and is still there after a reload; saving an edited text replaces it, and saving an empty or whitespace-only text removes it. The comment is saved only by an explicit Save (Cancel drops the edit); if it was changed in another tab meanwhile, the last save wins

### AC-02 (US-02) — happy path

**Given** the Owner is on a generation's detail view
**When** the Owner adds a tag and later removes it
**Then** each add or remove is saved at once (no separate Save step); the tag appears on the detail view and on the generation's gallery tile, and after removal disappears from both; tags keep the order they were added in, and the change survives a reload

### AC-03 (US-03) — happy path

**Given** generations with tags and comments exist
**When** the Owner opens the gallery and a detail view
**Then** each tile shows its first 3 tags (with «+N» for the rest) and the detail view shows all tags and the full comment; a tile shows a small marker when a comment exists

### AC-04 (US-04) — happy path

**Given** the Owner is on a generation's detail view (the only place deletion is offered)
**When** the Owner chooses delete and confirms in the confirmation dialog, which names the generation by its prompt excerpt and says that its images will be removed for good
**Then** the generation disappears from the gallery, its images (outputs and input copies) can no longer be opened, the Owner lands back on the gallery with a short «deleted» notice, and its files no longer take space on the machine; other open gen-img tabs drop it from their gallery the next time they are focused, and its detail view there says it no longer exists (AC-14)

### AC-05 (US-04) — happy path

**Given** the Owner opened the delete confirmation
**When** the Owner cancels or closes the dialog
**Then** nothing is deleted and the detail view stays as it was

### AC-06 (US-01) — error

**Given** the Owner is editing a comment
**When** the Owner tries to save a comment longer than 2 000 characters (counted as the characters the Owner sees, not bytes)
**Then** the system does not save it and tells the Owner the comment must be at most 2 000 characters, keeping the typed text

### AC-07 (US-02) — error

**Given** the Owner is adding a tag
**When** the tag is empty after trimming, longer than 32 characters, or contains characters other than letters of any alphabet, digits, spaces, «-» and «_»
**Then** the system does not add it and tells the Owner what a tag may contain

### AC-08 (US-02) — domain invariant

**Given** a generation already has 10 tags, or already has a tag that matches the new one ignoring case and surrounding spaces
**When** the Owner adds a tag
**Then** the system keeps the invariant «a generation holds each tag once, at most 10»: an 11th tag is refused with the reason, and a duplicate is not added twice (tags are stored trimmed, lower-case, inner spaces collapsed)

### AC-09 (US-04) — domain invariant

**Given** the Owner confirmed a deletion but removing the generation's files fails part-way, or gen-img stops in the middle of it
**When** gen-img continues or starts again
**Then** the deletion is all-or-nothing: either the generation is fully present (record, comment, tags, every image openable) and the Owner is told the deletion failed and why, or it is fully gone — never a gallery entry with missing images, never images of a deleted generation still openable

### AC-10 (US-05) — cross-context

**Given** a generation whose cost status is still «pending»
**When** the Owner deletes it
**Then** gen-img stops looking up its price; no later price lookup brings it back or fails because it is gone

### AC-11 (US-05) — cross-context

**Given** a generation is running
**When** the Owner comments on, tags or deletes another, already saved generation
**Then** the running generation continues and is saved normally, and the generate panel still shows its progress; a generation that is still running is not in the gallery and cannot be deleted

### AC-12 (US-05) — cross-context

**Given** the generate panel shows a just-saved generation as the latest result
**When** the Owner deletes that generation
**Then** the generate panel stops showing it as the latest result (no broken image or link to a missing generation)

### AC-13 (US-06) — authorization

**Given** a page from another site is open in the Owner's browser while gen-img runs
**When** that page tries to change a comment or tags, or delete a generation, through gen-img
**Then** gen-img refuses: nothing is changed or deleted

### AC-14 (US-04) — error

**Given** a generation was already deleted (for example in another tab)
**When** the Owner tries to comment on, tag or delete it again
**Then** the system tells the Owner the generation no longer exists and offers the way back to the gallery; nothing else changes

### AC-15 (US-01, US-02) — authorization

**Given** a comment or tag contains text that looks like markup or a script
**When** it is shown in the gallery or detail view
**Then** it is shown as plain text exactly as written — it never runs or changes the page

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Comment / tag save | ≤ 100 ms p95 server time | integration test over a seeded data dir |
| Delete (record + up to 4 outputs + 8 input copies) | ≤ 300 ms p95 server time | integration test over a seeded data dir |
| Gallery first page (24 items, 1 000 generations, each with 10 tags and a comment) | ≤ 300 ms p95 server time (unchanged from step 2) | NFR test over a seeded data dir |
| Deletion durability | 0 half-deleted generations after a crash/kill mid-delete — after restart a generation is either fully present or fully gone | integration test with a failing file step + restart test |
| Disk reclaimed | 100 % of a deleted generation's files removed by the time the deletion is confirmed to the Owner (or by the next start after a crash) | integration test asserts the generation dir is gone |
| Limits | comment ≤ 2 000 characters; tag 1–32 characters; ≤ 10 tags per generation | unit tests over the validation rules |

## 6.1 Security / privacy

- **Data classification:** confidential — comments and tags are the Owner's private notes.
- **Personal data touched:** none beyond the Owner's own text.
- **AuthZ/AuthN impact:** no accounts (single Owner); the new change and delete actions sit behind the same «own pages on the Owner's machine only» boundary as generating (AC-13). Deletion is the first destructive action in gen-img.
- **Abuse cases:**
  - A foreign page tries to delete or edit generations (CSRF, DNS rebinding): refused without effect (AC-13).
  - Markup or script in a comment/tag: shown as text only (AC-15).
  - Oversized comment or tag spam: bounded by the limits in §6 (AC-06…AC-08).
  - A crafted id or path in a delete request reaching files outside the generation: deletion removes only the generation's own recorded directory, never a path taken from the request.
  - Accidental deletion: explicit confirmation naming the generation (AC-04/AC-05); no bulk delete.
- **Security review:** Required — first destructive action and new mutating endpoints.

## 7. Metrics / KPIs

- **Generations with a comment or tag** — baseline: 0 %, target: ≥ 20 % of generations created after shipping carry a comment or a tag within 4 weeks (count over the data dir).
- **Half-deleted generations** — baseline: n/a, target: 0 ever (a record without files or files without a record after any deletion; checked by the boot sweep log and a consistency query).
- **Accidental deletions reported** — baseline: n/a, target: 0 in the first 4 weeks (owner self-report).

## 8. Open questions

- [ ] When re-run / «use as input» (step 6) links a new generation to a parent, what happens to the link if the parent is deleted? Default now: nothing links generations yet; step 6 must decide (keep the child, drop the link). — owner: dmytro.hopko, due: sdd:specify for roadmap step 6
- [ ] Should tags become filterable once the gallery is large? Default now: no — out of v1 (idea-brief §5); tags are shown only. — owner: dmytro.hopko, due: after 4 weeks of use (KPI review)
