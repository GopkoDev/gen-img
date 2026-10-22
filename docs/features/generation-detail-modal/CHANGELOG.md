# Changelog — generation-detail-modal

## generation-detail-modal — open a generation over the grid and step through neighbours

**What:** A card opened from the gallery grid now shows the generation in a dialog over the grid, at the generation's own address — images on the left (the first output large, the others one click away), metadata and every action of the detail page on the right. ← / → (or «Newer» / «Older») step through the grid's newest-first order, loading the grid's next page at the end; stepping is unavailable while a comment or tag text is unsaved or the delete confirmation is open, and never from a text field. Esc, ×, a click outside or the browser's Back close it — one Back however many steps — back to the grid where it was, with focus on the last card shown; Forward reopens it. Comments and tags update the card behind the dialog in place; re-run and «use as input» open Generate, and Back returns to the grid; deleting moves to the neighbour with «Generation deleted.» (or closes onto the grid). A generation's address reached directly — typed, reloaded, a new tab, the recent strip — still shows the full detail page.

**Why:** Comparing results meant a round trip between the grid and a separate page per generation ([spec](./spec.md) §1/§2). Decisions: the dialog visit is marked in the history entry and honoured only for the current app load ([ADR-0033](./adr/0033-mark-a-dialog-visit-in-the-history-entry-and-render-the-grid-under-it-only-for-this-app-load.md)); edits update the card in place instead of re-reading every page ([ADR-0034](./adr/0034-update-the-edited-card-in-place-instead-of-refetching-every-loaded-gallery-page.md)). Deliberate changes to shipped behaviour are listed in spec §1.

**How to use:** open «Gallery», click a card, use ← / →.

**Operational notes:**
- Migration: none. API: unchanged.
- Rollback: revert the branch.

**Acceptance criteria delivered:** AC-01 … AC-11 (spec §5). Independent review: PASS after fixes ([review](./_review/review-2026-10-19.md)). Verified on the running app 2026-10-19 against a copy of the Owner's data: a generation's address and its detail read are served. The dialog's look and paint timing in a real browser are left to the Owner's check at merge (jsdom has no paint timing).
