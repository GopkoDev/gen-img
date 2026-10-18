# Changelog — model-price-preview

## model-price-preview — see a model's price and an estimate before generating

**What:** When the Owner picks a model, the generate panel shows its published price under the picker — «$0.0184 / image», a range such as «$0.045–$0.09 / image», «priced per token», or «Price unknown» (never $0). Above Generate it shows a labelled estimate for the current request, e.g. «Estimate ≈ $0.04 for 2 images», adding input images where the provider bills them per image («+ 1 input») and following every change of the number of images or attachments. Per-token models get an estimate only from the Owner's own past known costs with that provider and model («≈ $0.12 for 2 images, from your last 5 generations»), otherwise «No estimate before generating». Pricing never blocks Generate, and the recorded cost after generating stays the only cost.

**Why:** Choosing a model or asking for 4 images used to happen blind ([spec](./spec.md) §1/§2). Decisions: price through an optional, lazily loaded port method cached per model ([ADR-0020](./adr/0020-load-a-models-price-lazily-through-an-optional-port-method.md)); per-token estimates from the Owner's last known costs ([ADR-0021](./adr/0021-estimate-per-token-models-from-the-owners-last-known-costs.md)).

**How to use:** pick a model in the generate panel. API ([openapi.yaml](./contracts/openapi.yaml)): `GET /api/providers/{providerId}/price?model=` → `{price, fetchedAt}`; `GET /api/generations/cost-history?provider=&model=` → `{count, perImageMicros}`.

**Operational notes:**
- Migration: none.
- Config: none. Prices come from public sources without a key — OpenRouter per model (`/api/v1/images/models/{id}/endpoints`), Vercel from its public model list; cached 10 minutes per model.
- Rollback: revert the branch.

**Acceptance criteria delivered:** AC-01 … AC-10 (spec §5).
