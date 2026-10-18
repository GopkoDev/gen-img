# Vercel AI Gateway fixtures

- `models.json` — five entries trimmed from the real public `GET https://ai-gateway.vercel.sh/v1/models` (unauthenticated, 2026-10-18; descriptions shortened): two image-only models, one multimodal language model tagged `image-generation`, a plain language model and a video model.
- Every other file is **handcrafted** from the public docs (image generation via chat completions, REST API reference — 2026-10-18), not recorded: no real Vercel call was made (no key; owner rule). Replace them with recorded answers after the first real call (spec §8 D3–D6). `providerMetadata.gateway.generationId` on the edits answer is an assumption (D6).
- `models-pricing.json` — six entries trimmed from the real public `GET https://ai-gateway.vercel.sh/v1/models` (no key, 2026-10-18), kept with their `pricing` for step 7 (model-price-preview).
