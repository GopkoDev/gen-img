# Changelog — rerun-and-reuse

## rerun-and-reuse — re-run any generation and reuse its outputs as inputs, with lineage

**What:** On a generation's detail view the Owner can **Re-run** it: the generate panel opens with the same provider, model, prompt, parameters and input images, says it re-sends the same inputs (results can differ), and generates as-is or after changes. Switching model or provider keeps what the new model supports and names what was removed. **Use as input** on any output image opens the panel with just that image attached. gen-img reads images it already stores itself (no download/upload), and the new generation keeps its own copies. Each detail view shows its **lineage** one level each way — «Re-run of» / «Made from output N of», and the newest 50 generations made from it. Deleting a source never blocks or changes derived generations; they show «source deleted».

**Why:** Repeating or refining a result meant retyping and re-uploading ([spec](./spec.md) §1/§2). Key decisions: stored images named by generation + position and read server-side ([ADR-0017](./adr/0017-refer-to-stored-images-by-generation-and-position-and-read-them-server-side.md)), lineage columns without a foreign key ([ADR-0018](./adr/0018-record-lineage-as-source-columns-without-a-foreign-key.md)), draft source in the home address ([ADR-0019](./adr/0019-carry-the-draft-source-in-the-home-address-and-apply-it-once.md)).

**How to use:** Detail view → **Re-run** or **Use as input** under an output. API ([openapi.yaml](./contracts/openapi.yaml)): `POST /api/generations` accepts `source: {id, relation: rerun|reuse, output?}` and `inputs: [{stored: {generationId, kind, position}} | {upload: n}]`; `GET /api/generations/{id}` returns `source` and `derived`.

**Operational notes:**
- Migration: adds `0007_add_generation_source` (three nullable columns + a partial index) — applied on server start; `pnpm db:rollback` reverts it.
- Feature flag / config: none.
- Rollback: revert the branch and `pnpm db:rollback` once.

**Acceptance criteria delivered:** AC-01 … AC-15 (spec §5).
