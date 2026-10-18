# Changelog — model-picker-preferences

## model-picker-preferences — prices on every picker entry, ★ favorites first, per-model preferences

**What:** The model picker is now a popover list (SCR-07). Every entry shows its model's published price in step 7's wording — «$0.0184 / image», a range, «priced per token», «price unknown» or «price unknown — couldn't load», never $0 — looked up only when the picker opens (entries usable before prices arrive). Each entry has a ★ toggle (pointer or keyboard) that marks a favorite without selecting the model; favorites are listed first under «Favorites», the rest under «All models», in the provider's order. Preferences (favorite, hidden) are kept per provider + model on the machine and survive restarts. Hidden models (the toggle arrives with the Models page, step 10) are left out of the picker; a hidden model that is selected — e.g. by a re-run — stays selected and is marked «hidden». Every automatic model choice (first load, provider switch, unavailable re-run model, reuse needing input images) picks the first suitable favorite, else the first suitable visible model — never a hidden one.

**Why:** The Owner kept scrolling to the same few models and compared prices by selecting each one ([spec](./spec.md) §1/§2). Decisions: one preference row per provider + model in a new `models` module ([ADR-0026](./adr/0026-keep-model-preferences-as-one-row-per-provider-and-model-in-a-models-module.md)); every listed model's price looked up when the picker opens, deduplicated, capped at 4 in flight and failures cached 60 s on the server ([ADR-0027](./adr/0027-look-up-every-listed-models-price-when-the-picker-opens-deduplicated-and-capped-on-the-server.md), amends ADR-0020); a popover list with a separate ★ button per row instead of the select ([ADR-0028](./adr/0028-render-the-model-picker-as-a-popover-list-with-a-separate-favorite-toggle-per-row.md)).

**How to use:** open the model picker in the generate panel and click ★ on a model. API ([openapi.yaml](./contracts/openapi.yaml)): `GET /api/model-preferences?provider=` → `{preferences}`; `PATCH /api/model-preferences` `{provider, model, favorite?, hidden?}` → the model's preference (a flag not named keeps its value; both off removes the row).

**Operational notes:**
- Migration: `0008_create_model_preferences` (applied on boot; `pnpm db:rollback` reverts it).
- Config: none.
- Rollback: revert the branch, then `pnpm db:rollback` once.

**Acceptance criteria delivered:** AC-01 … AC-14 (spec §5). Independent review: PASS after fixes ([review](./_review/review-2026-10-19.md)). Verified on the running app 2026-10-19: migration 0008 applied on a fresh data dir, a real OpenRouter model favorited and listed, an unknown model refused, the price endpoint answering.
