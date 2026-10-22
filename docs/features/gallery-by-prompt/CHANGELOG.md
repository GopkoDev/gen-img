# Changelog — gallery-by-prompt

## gallery-by-prompt — the gallery grouped by identical prompt

**What:** «By prompt» joins the gallery's view switch: one card per prompt used more than once, the most recently used first — its latest image, the prompt's first two lines, «N generations · M images» and the models that made it; an «Include single-use prompts» switch adds the rest. Opening a card shows that prompt's grid — every generation of exactly that text, newest first — under the full prompt (collapsible) and its count; the detail dialog steps within the prompt, and deleting stays within it. «Identical» is literal: any difference in characters, spaces, line breaks or case is another group. Addresses name a prompt only by a 32-character key, never its text; a mistyped or emptied key says so plainly. Generations made before this step are grouped too — their keys are filled in on the first start.

**Why:** Re-sent prompts' results were scattered through the gallery ([spec](./spec.md) §1/§2). Decisions: a prompt key (first 32 hex of SHA-256 over the exact text) stored with each generation and backfilled on boot ([ADR-0037](./adr/0037-key-each-prompt-by-a-hash-stored-with-the-generation-and-backfilled-on-boot.md)); prompt groups paged by their latest generation, reused prompts by default ([ADR-0038](./adr/0038-page-the-prompt-groups-by-their-latest-generation-showing-reused-prompts-by-default.md)).

**How to use:** open «Gallery», choose «By prompt». API ([openapi.yaml](./contracts/openapi.yaml)): `GET /api/generations/prompts?cursor=&single=0|1`, `GET /api/generations/prompts/{key}`, `GET /api/generations?prompt=<key>`.

**Operational notes:**
- Migration: `0010_add_generation_prompt_key` (column + index), then a one-time key backfill on boot (idempotent).
- Rollback: revert the branch, then `pnpm db:rollback` once.

**Acceptance criteria delivered:** AC-01 … AC-10 (spec §5). Independent review: PASS after fixes ([review](./_review/review-2026-10-19.md)). Verified on the running app 2026-10-19 against a copy of the Owner's data: migration 0010 applied, every generation keyed on boot (0 left without a key), 16 prompt groups (2 reused), a prompt's page matches its count.
