# Changelog — vercel-ai-gateway

## vercel-ai-gateway — Vercel AI Gateway as the second provider, with prices that arrive later

**What:** The generate panel now starts with a **Provider** selector (OpenRouter / Vercel AI Gateway; the first configured one is preselected and the choice is remembered for the browser session). With Vercel selected, the model list shows the gateway's image-producing models — image-only models (up to 4 images per request) and multimodal language models (1 image) — and input images for models the gateway's catalog lists as taking images. Vercel models offer no seed or aspect ratio (not documented by the gateway yet). Vercel generations are saved like any other; when the answer carries no price, the cost shows **«pending»** and gen-img looks it up in the background: it becomes the amount (`known`) or `unavailable` within about 10 minutes, and the gallery/detail update by themselves. Pending lookups resume after a restart. OpenRouter behaves exactly as before.

**Why:** Both providers were required for v1 ([spec](./spec.md) §1/§2). Key decisions: one adapter picks the gateway call path per model ([ADR-0012](./adr/0012-pick-the-vercel-call-path-per-model-inside-one-adapter.md)); deferred costs are resolved by a bounded, DB-driven background lookup ([ADR-0013](./adr/0013-resolve-deferred-costs-with-a-bounded-db-driven-background-lookup.md)).

**How to use:** add `AI_GATEWAY_API_KEY=…` to `.env.local`, restart, pick «Vercel AI Gateway» in the panel. API ([openapi.yaml](./contracts/openapi.yaml) v0.3.0): `provider: "vercel"` in `POST /api/generations`; `GET /api/providers/vercel/models`; `costStatus: "pending"` resolves on later reads.

**Operational notes:**
- Migration: `0005_add_generation_cost_ref` (new nullable `generations.cost_ref` + partial index for pending costs) — applied on start; `pnpm db:rollback` reverts it.
- Config: `AI_GATEWAY_API_KEY` (server-only, already in `.env.example`).
- Background: price lookups at +5 s, doubling to 60 s, ≤ 8 per generation, 10-minute deadline; timers don't keep the process alive.
- **Not verified live:** no real Vercel call was made (no key; owner rule). Open questions to confirm on the first real call: D3 (own-key price), D4 (seed), D5 (inputs path + catalog vs docs on image-only edits), D6 (price reference on image-only answers — if absent those costs end «unavailable»). Fixtures in `tests/fixtures/vercel/` are handcrafted from the docs.
- Rollback: revert the branch and run `pnpm db:rollback` once.

**Acceptance criteria delivered:** AC-01 … AC-15 (spec §5) — provider choice, image-only + multimodal LLM generation, Vercel input images, honest pending → known/unavailable costs incl. restarts, gateway failures with reasons, per-model limits, missing-key guidance, one generation at a time across providers, mixed gallery, key containment, foreign-page refusal, OpenRouter unchanged.
