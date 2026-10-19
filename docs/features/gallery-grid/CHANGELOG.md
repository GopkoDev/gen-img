# Changelog — gallery-grid

## gallery-grid — cost, duration and size on every card; the gallery loads as you scroll

**What:** Every gallery card carries a one-line strip over the bottom of its preview: the recorded cost («$0.04», «cost pending», «cost unavailable» — never $0 for an unknown cost), the duration («23.4 s»), the size of the image the preview shows («2512×1680»), and the count when there are several outputs («4 images», «2 of 4 images» when fewer came back). The strip stays when a preview can't be shown, and screen readers hear each value with its name. The newest-first grid loads its next page as the Owner scrolls near the end («Load more» stays as a fallback, «That's everything» at the end); a failed page or refresh keeps the loaded cards with an inline message and never retries by itself. Coming back from a generation's page shows the same pages at the same scroll position, for the whole session. A pending cost refreshes on its own card only — the gallery and the recent strip are not re-read for it.

**Why:** Comparing cost, duration and size meant opening each generation; long histories meant many «Load more» clicks ([spec](./spec.md) §1/§2). Decisions: pending costs refresh per card ([ADR-0031](./adr/0031-refresh-pending-costs-per-generation-instead-of-refetching-every-loaded-page.md)); an end-of-grid sentinel loads pages and the scroll position is kept per visit ([ADR-0032](./adr/0032-load-the-next-gallery-page-from-an-end-of-grid-sentinel-and-restore-the-scroll-position-per-visit.md)).

**How to use:** open «Gallery» and scroll. API ([openapi.yaml](./contracts/openapi.yaml)): list items gain `durationMs`.

**Operational notes:**
- Migration: none.
- Config: none.
- Rollback: revert the branch.

**Acceptance criteria delivered:** AC-01 … AC-10 (spec §5). Independent review: PASS after fixes ([review](./_review/review-2026-10-19.md)). Verified on the running app 2026-10-19 against a copy of the Owner's data: list items carry duration and image size, `/gallery` served. Badge contrast is checked by token tests in both themes; the visual check over real previews is left to the Owner at merge.
