---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 13"
---

# 0035 — Keep the gallery view in its address, with a list cache per view

- **Status:** Accepted
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The gallery gains views — all, one model, by model (spec AC-01…AC-03) — and steps 14–15 add more (one prompt, a folder). Each view must survive Back, reload and links, keep its own scroll, open the detail dialog that steps within it, and stay current when a cost resolves or a card is curated (AC-04, AC-05). Today the gallery has one list cache (`["generations"]`, exact) that every patch and the dialog use, one saved scroll, and the dialog's history state names no view (devil's-advocate pass).

## Decision drivers

- Spec AC-03: a view is an address; AC-10: the sidebar entry is always «All».
- Spec AC-04: the view behind the dialog stays; stepping stays within the model.
- Spec AC-05 / §6: updates reach every view; a change re-reads only views on screen.
- ADR-0033: the dialog visit lives in the history entry.

## Considered options

1. **View in the gallery's query string (`/gallery?provider=…&model=…`, `/gallery?view=models`); one list cache per view under the gallery prefix (`["generations"]` for all, `["generations", "model", provider, model]`, `["generations", "models"]` — one cache for the model choice and «By model»); the dialog's history state carries the grid view and the stepping view; scroll saved per view key; card patches and pending costs applied to every cached list of the gallery shape.**
2. **View in component state, one cache refiltered in the browser** — Back and reload lose the view; filtering the loaded pages can't page a model whose generations are far down the list.
3. **A path per view (`/gallery/models/<provider>/<model>`)** — model ids contain `/`, `:` and `+`; encoding them into path segments is fragile, and the section registry matches exact paths (ADR-0022).

## Decision outcome

**Chosen:** Option 1. The query string round-trips any model id through standard encoding, keeps `/gallery` as the section's one path, and a cache per view gives each view its own paging and server filter; prefix invalidation already refreshes only active queries and marks the rest stale. Option 2 breaks AC-03 and paging; option 3 breaks on real model ids.

## Consequences

**Positive**
- Steps 14–15 add a view by adding one parameter and one key.

**Negative**
- Patches (cost, tags, comment, delete) must walk every gallery-shaped list in the cache — one helper, tested against the recent strip's different shape.

**Neutral**
- This meets ADR-0022's revisit trigger («typed search parameters beyond one-off flags»): the hand-written router still holds because only the Gallery section parses parameters, through one small `galleryView.ts` (three parameters, round-trip tested); a second section needing typed parameters would reopen ADR-0022.
- The full-page delete still lands on «All» with the notice (curate-gallery); dialog deletes stay in the view.

## Links

- Spec: [[../spec.md]] AC-03…AC-06, AC-10
- SAD: [[../sad.md]] §4, §8
- Related ADR: ADR-0022, ADR-0025, ADR-0031, ADR-0032, ADR-0033, ADR-0034
