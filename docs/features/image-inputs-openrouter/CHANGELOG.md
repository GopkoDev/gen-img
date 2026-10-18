# Changelog — image-inputs-openrouter

## image-inputs-openrouter — attach input images (img→img, img+text→img) to OpenRouter generations

**What:** For models that accept input images, the generate panel shows an input area with the model's allowed count (capped at 8). Images arrive via a file picker or drag-and-drop and show as thumbnails in attach order. Each file is checked on the spot: PNG, JPEG, WebP or GIF up to 10 MB; anything else is refused with its reason. A model switch marks attachments beyond the new limit and blocks Generate. Edit-only models require at least one image. Copies of the inputs are stored with the generation, all-or-nothing. The detail page lists them (name, size, link to the full image), and gallery tiles show «N inputs». The stored raw request references the copies, never the image data.

**Why:** editing an existing picture meant re-uploading it into a playground, where it got lost ([spec](./spec.md) §1/§2). Key decisions: inputs travel as multipart parts of the start request ([ADR-0010](./adr/0010-accept-input-images-as-multipart-parts-of-the-start-generation-request.md)); copies live in their own `generation_inputs` table, committed in the same transaction as the outputs ([ADR-0011](./adr/0011-store-input-copies-in-a-separate-generation-inputs-table.md)).

**How to use:** pick a model that accepts images, drop or choose files, write the prompt, Generate. API ([openapi.yaml](./contracts/openapi.yaml) 0.2.0): `POST /api/generations` as `multipart/form-data` — a `request` text field holding the JSON body plus `inputs` files in order; JSON without files works as before. `Generation.inputs[]`, `GenerationSummary.inputsCount`; `ImageModel.params.inputs {min, max}`.

**Operational notes:**
- Migration: adds `0004_create_generation_inputs` — applied on server start; `pnpm db:rollback` reverts it.
- Upload limit: request body ≤ 8 × 10 MiB + 1 MiB.
- Tests: timing NFRs now run in a separate serial Vitest project `nfr`, after the other projects.
- Rollback: revert the branch and run `pnpm db:rollback` once.

**Acceptance criteria delivered:** AC-01 … AC-11 (spec §5).
