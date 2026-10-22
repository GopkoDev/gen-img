# Changelog — gallery-by-model

## gallery-by-model — the gallery filtered to one model, or grouped by model

**What:** Above the gallery a view switch offers «All», «By model» and a model choice listing every provider + model the Owner has generated with, most recent first, with counts. Choosing a model shows only its generations — the same cards, badges and scrolling as the main grid, with a heading «<model> · <provider> · N generations» and «Show all generations»; a model with no generations says so instead of an error. «By model» shows one section per provider + model, most recent first, with its count, its latest four cards and «Show all N». Each view lives in the gallery's address (Back, reload, links keep it) and keeps its own scroll; the sidebar's Gallery entry always opens «All». The detail dialog opened from a view keeps that view behind it and steps through that model only (from «By model»: all of the model's generations), and deleting moves within the model. Costs, tags and comments update in every view; a change re-reads only the views on screen.

**Why:** Judging or comparing models meant scanning the whole gallery by its model badges ([spec](./spec.md) §1/§2). Decisions: the view lives in the gallery's address with a list cache per view ([ADR-0035](./adr/0035-keep-the-gallery-view-in-its-address-with-a-list-cache-per-view.md)); a by-model index and one read for the models with counts and latest cards ([ADR-0036](./adr/0036-read-the-models-with-counts-and-their-latest-cards-in-one-request.md)).

**How to use:** open «Gallery», pick «By model» or a model. API ([openapi.yaml](./contracts/openapi.yaml)): `GET /api/generations?provider=&model=` (exact match; unknown → empty page); `GET /api/generations/models?latest=0..4`.

**Operational notes:**
- Migration: `0009_index_generations_by_model` (applied on boot; `pnpm db:rollback` reverts it).
- Rollback: revert the branch, then `pnpm db:rollback` once.

**Acceptance criteria delivered:** AC-01 … AC-10 (spec §5). Independent review: PASS after fixes ([review](./_review/review-2026-10-19.md)). Verified on the running app 2026-10-19 against a copy of the Owner's data: migration 0009 applied, models read with counts, a model's filtered list matches its count, `/gallery?view=models` served.
