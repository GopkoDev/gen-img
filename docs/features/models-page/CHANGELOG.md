# Changelog — models-page

## models-page — every model with price and parameters, hide from the picker, forget retired preferences

**What:** A new «Models» section (`/models`) lists every image model of each configured provider in one table per provider: name, id, published price in step 7's wording (looked up only for rows in view), and the parameters the model supports — aspect ratios, seed, images per request, input images («—» when unsupported). Each row has the picker's ★ favorite toggle and a «Show in picker» switch; hidden models stay listed, marked, so they can be shown again. Under a provider's table, «No longer offered» lists kept preferences of models the provider no longer lists, with «Forget». A provider without a key, a model list that can't load, or unreadable preferences each get their own plain state; toggles fail per row without touching others. The Generate form follows every change without a reload and, when hiding left no suitable visible model, says the suitable models are hidden and links to the Models page.

**Why:** Hiding was stored since step 9 but had no UI; comparing models meant selecting them one by one; retired preferences were invisible ([spec](./spec.md) §1/§2). Decisions: preference writes that only turn flags off skip the provider catalog ([ADR-0029](./adr/0029-turn-preference-flags-off-without-checking-the-provider-catalog.md), amends ADR-0026); one shared, per-flag optimistic mutation for the picker and the page ([ADR-0030](./adr/0030-change-preferences-through-one-shared-per-flag-optimistic-mutation.md)).

**How to use:** open «Models» in the sidebar. API ([openapi.yaml](./contracts/openapi.yaml)): `PATCH /api/model-preferences` with all named flags `false` now answers for any model id of a known provider, without contacting it.

**Operational notes:**
- Migration: none.
- Config: none. New Vitest project `nfr-web` (jsdom timing tests, after `nfr`).
- Rollback: revert the branch.

**Acceptance criteria delivered:** AC-01 … AC-14 (spec §5). Independent review: PASS after fixes ([review](./_review/review-2026-10-19.md)). Verified on the running app 2026-10-19: `/models` served, a retired id forgotten without the catalog, a real model hidden and listed.
