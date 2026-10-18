---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 10"
---

# 0029 — Turn preference flags off without checking the provider catalog

- **Status:** Accepted (amends [ADR-0026](../../model-picker-preferences/adr/0026-keep-model-preferences-as-one-row-per-provider-and-model-in-a-models-module.md)'s write check: the catalog check now applies only to a write that turns a flag on)
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Step 9 refuses every preference write for a model the provider's catalog doesn't list, and every write while the catalog can't be loaded or the provider has no key. The Models page's «Forget» exists exactly for models the catalog no longer lists (spec AC-08), and un-hiding or un-favoriting must not depend on a provider being reachable (AC-12). The devil's-advocate pass found that, as built, «Forget» could never succeed.

## Decision drivers

- Spec AC-08 / AC-12: turning a preference off never needs the provider; turning one on still needs a model the provider offers.
- Spec §6.1: a crafted id can only remove the Owner's own rows.
- Keep one write operation (step 9 contract) rather than a second way to change the same row.

## Considered options

1. **Same PATCH; the catalog is consulted only when the request turns a flag on** — a request whose named flags are all `false` skips the provider and catalog checks (unknown provider still refused).
2. **A separate «forget» operation that deletes a row unconditionally** — PATCH keeps its catalog check for every write.

## Decision outcome

**Chosen:** Option 1. It covers «Forget», un-hiding and un-favoriting during an outage with the one contract the picker already uses; option 2 adds a second write path for the same row and still leaves «show in picker» / ★ off failing while the catalog is down.

## Consequences

**Positive**
- Every «off» action works offline from the provider; the store can always be cleaned.

**Negative**
- An «off» write for a model id that was never stored succeeds as a no-op (answers both flags false) — harmless, same as toggling twice.

**Neutral**
- `PROVIDER_NOT_CONFIGURED` / `PROVIDER_ERROR` / unknown-model answers now only come from writes that turn a flag on.

## Links

- Spec: [[../spec.md]] AC-08, AC-12
- SAD: [[../sad.md]] §4, §8
- Related ADR: [ADR-0026](../../model-picker-preferences/adr/0026-keep-model-preferences-as-one-row-per-provider-and-model-in-a-models-module.md)
