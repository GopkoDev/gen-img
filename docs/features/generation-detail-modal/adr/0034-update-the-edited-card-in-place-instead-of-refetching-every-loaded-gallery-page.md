---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 12"
---

# 0034 — Update the edited card in place instead of refetching every loaded gallery page

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

A comment save, a tag add or a tag removal invalidates the whole gallery key today (curate-gallery). That was cheap while the gallery was unmounted during a detail visit — the key was only marked stale. With the grid mounted under the dialog (ADR-0033), each edit re-reads every loaded page, and while that refetch runs the grid can't load its next page, so stepping past the last card stalls (devil's-advocate pass; spec §6 «Edits inside the dialog»).

## Decision drivers

- Spec §6: a comment or tag change re-reads only that generation.
- Spec AC-07: the change shows on the card behind the dialog without reloading the grid's pages.
- app-shell: the recent strip still refreshes when a generation is curated.

## Considered options

1. **After a successful comment/tag change, write the new tags / «has comment» into that card of the loaded gallery pages (`setQueryData` on the exact gallery key), refresh the generation's own detail, and invalidate the recent strip's key only** — no page re-read.
2. **Keep invalidating the gallery key but pause the grid's query while the dialog is open** — the edit shows on the card only after closing, and the pause still re-reads every page then.

## Decision outcome

**Chosen:** Option 1. The server already answers each change with the new tags/comment, so patching the one card is exact and costs no request; option 2 delays the card and moves the same cost to closing.

## Consequences

**Positive**
- Tagging ten images in a row costs ten small writes, no page re-reads; stepping never stalls on an edit.

**Negative**
- The card's tags/comment flag are kept in two places (detail + summary) and must be patched together (one helper, tested).

**Neutral**
- Deletion keeps invalidating the gallery (a card disappears; the order must be re-read — AC-06).

## Links

- Spec: [[../spec.md]] AC-07, §6
- SAD: [[../sad.md]] §4, §8
- Related ADR: ADR-0016 (tags one at a time, comment whole), ADR-0025, ADR-0031
