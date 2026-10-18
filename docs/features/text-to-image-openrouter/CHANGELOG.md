# Changelog — text-to-image-openrouter

## text-to-image-openrouter — generate images from text via OpenRouter and keep every result in a local gallery

**What:** The Owner picks an OpenRouter image model (the list shows each model's name and id, and only the parameters that model supports), writes a prompt, optionally sets aspect ratio, seed and number of images (1–4), and generates. Every successful generation is saved on the machine with its output images and full metadata: provider, model, prompt, requested vs received parameters, cost with its status («unavailable» when the provider gives no price — never $0), created-at, duration, and the raw request/response with the key removed and image data replaced by file references. A newest-first gallery and a detail page show it all. One generation runs at a time; closing the page doesn't cancel it, and a failure nobody saw is shown on the next visit until dismissed.

**Why:** Prompts and results got lost in provider playgrounds ([spec](./spec.md) §1/§2). Key decisions: provider-neutral port returning a normalized result ([ADR-0004](./adr/0004-return-a-normalized-generation-result-from-the-image-provider-port.md)), single-slot server job polled by the UI ([ADR-0005](./adr/0005-run-generations-as-a-single-slot-server-job-polled-by-the-ui.md)), all-or-nothing save via a staging dir + boot sweep ([ADR-0006](./adr/0006-commit-generations-atomically-via-staging-dir-and-boot-sweep.md)), request guard against foreign pages and DNS rebinding ([ADR-0007](./adr/0007-guard-every-api-request-by-host-origin-and-fetch-metadata.md)), redacted raw exchange ([ADR-0008](./adr/0008-redact-secrets-and-image-payloads-from-the-stored-raw-exchange.md)).

**How to use:** put `OPENROUTER_API_KEY=…` in `.env.local`, run `pnpm dev` (or `pnpm build && pnpm start`) and open the app. API ([openapi.yaml](./contracts/openapi.yaml)): `POST /api/generations` `{provider:"openrouter", model, prompt, params:{n, aspectRatio?, seed?}}` → 202 job; poll `GET /api/generation-job`; browse `GET /api/generations?cursor=`, `GET /api/generations/{id}`; images at `/api/files/<path>`.

**Operational notes:**
- Migration: adds `0002_create_generations` (generations + generation_images) and `0003_index_generation_images_path` — applied automatically on server start; `pnpm db:rollback` reverts one at a time.
- Data dir: images under `<GEN_IMG_DATA_DIR>/generations/<id>/`, staging under `.staging/` (cleaned on start), last failure notice in `last-job-failure.json`.
- Feature flag / config: `OPENROUTER_API_KEY` (server-only). Without it the gallery works and generation explains how to configure the key.
- Rollback: revert the branch and run `pnpm db:rollback` twice.

**Acceptance criteria delivered:** AC-01 … AC-19 (spec §5) — generate + auto-save, model catalog with supported parameters, newest-first paging + empty state, field validation, provider failures with the reason kept, cost never shown as free, all-or-nothing save, requested vs received parameters, partial results kept, one generation at a time across tabs and reloads, key never exposed, loopback-only, foreign pages refused, only stored images served, provider shown everywhere.
