# OpenRouter fixtures

- `models.json` — three entries trimmed from the real `GET https://openrouter.ai/api/v1/images/models` (2026-10-18; descriptions shortened).
- `images-*.json`, `error-*.json` — handcrafted from the documented Image API shapes (openrouter.ai/docs/features/multimodal/image-generation, …/api-reference/errors, 2026-10-18); images are tiny generated PNGs.
- `endpoints/*.json` — trimmed (`provider_name`, `provider_slug`, `pricing` only) from the real public `GET https://openrouter.ai/api/v1/images/models/{author}/{slug}/endpoints`, fetched without a key on 2026-10-18 (step 7, model-price-preview).
