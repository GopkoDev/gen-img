# Changelog — app-shell

## app-shell — a left navigation bar with one page per section

**What:** Ukiyo now opens in an app frame: a left navigation bar lists the sections — **Generate** (the start page, `/`) and **Gallery** (`/gallery`) — and marks the current one; a generation's detail page (`/generations/:id`) counts as Gallery. Every page has its own address that works with reload, bookmarks, new tabs and back/forward, and its own tab title («Gallery · Ukiyo»). An unknown address shows «Page not found.» with a way back to Generate. Switching sections keeps the draft on Generate — prompt, settings and attached images — and the Generate entry shows a spinner while a generation runs and a red dot while a failure waits to be dismissed; a finished generation appears in the gallery without a reload. Re-run, «Use as input» and the empty gallery's «Write a prompt» bring the Owner to Generate (the prompt focused for the last one); a deletion lands on the Gallery with «Generation deleted.». Below `md` the bar becomes a top row.

**Amendment 2026-10-19 (owner decisions, before merge):** the frame is the component kit's `sidebar-08` inset sidebar — it collapses to an icon rail (its button or `Ctrl/⌘+B`, labels as tooltips, the Generate spinner/dot kept on the icon), opens as a slide-in sheet below `md` (replacing the top row), and has a breadcrumb in the inset header. A **Light / Dark / System** toggle sits in the sidebar footer; the default follows the system (also live), the choice is remembered in the browser (`gen-img:theme`, works with storage blocked), and an inline script applies it before the first paint. The Generate page shows the **ten latest generations** to the right of the form (stacked below `lg`) — one thumbnail each, newest first, opening the detail page, refreshed when a generation finishes or is deleted.

**Why:** one crowded home page could not take the next sections (Models, Folders) or a full-width gallery grid ([spec](./spec.md) §1/§2). Decisions: sections are declared once in a registry over the hand-written router, no routing library ([ADR-0022](./adr/0022-declare-sections-in-one-registry-over-the-hand-written-router.md)); the Generate page stays mounted (hidden) and applies address-carried drafts on every arrival ([ADR-0023](./adr/0023-keep-the-generate-page-mounted-and-apply-address-carried-drafts-on-every-arrival.md), amends ADR-0019); the shell on the `sidebar-08` block (ADR-0022 amendment); theme ([ADR-0024](./adr/0024-follow-the-system-theme-with-a-class-based-toggle-applied-before-first-paint.md)); recent generations from the list endpoint with `limit=10` under the gallery's query key ([ADR-0025](./adr/0025-read-recent-generations-from-the-list-endpoint-under-the-gallery-query-key.md)).

**How to use:** click a section in the bar. To add a section (roadmap steps 10, 15): one entry in `SECTIONS` (`src/web/sections.tsx`) + its page.

**Operational notes:**
- Kit code: `pnpm dlx shadcn@latest add sidebar-08` vendored into `src/web/components/ui/` (sidebar, sheet, tooltip, dropdown-menu, separator, skeleton, breadcrumb) + `src/web/hooks/use-mobile.ts`; the block's `cn` imports were pointed at `@/lib/utils` and its stray `cn` npm dependency dropped; no new packages (all Radix parts come from the existing `radix-ui`).
- Migration: none. Config: none. API: unchanged (the recent panel uses the existing `limit` parameter) (the server's SPA fallback already served every address; now covered by `src/server/spa-fallback.int.test.ts`).
- Address changes: the gallery moved from `/` to `/gallery`; the «deleted» notice is now `/gallery?deleted=1`; new carried flag `/?focus=prompt`. `/?rerun=` and `/?reuse=&output=` are unchanged.
- Revisiting a section reloads nothing (gallery and detail are refreshed by changes and on window focus); a finished generation also refreshes an open detail page.
- Review: independent `sdd:reviewer` — no blockers; R1–R6 fixed on the branch ([review](./_review/review-2026-10-18.md)).
- Known gap: the production bundle is one ~581 kB chunk (Vite's 500 kB warning); code-splitting is left for later.
- Review of the amendment: independent `sdd:reviewer` — no blockers; B1–B6 fixed ([review](./_review/review-2026-10-18.md)).
- Rollback: revert the branch.

**Acceptance criteria delivered:** AC-01 … AC-16 (spec §5); the narrow sheet, both themes, the no-flash load and the section-switch timing are additionally for a manual browser check.
