---
id: T4
title: "Add the prompt views to the address and the caches"
layer: "app"
deps: []
blocks: ["T5"]
acs: ["AC-03", "AC-04"]
files_hint: ["src/web/features/gallery/galleryView.ts", "src/web/features/gallery/galleryView.test.ts", "src/web/features/gallery/summaryPatch.ts", "src/web/features/gallery/summaryPatch.test.tsx", "src/web/features/gallery/useGalleryView.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T4 — Add the prompt views to the address and the caches

## Place in the sequence

- **Blocked by:** — · **Blocks:** T5 — Show the gallery grouped by prompt · **Wave:** 1.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** prompt views to keep their address, scroll and dialog stepping like the other gallery views
> **So that** browsing by prompt works the same way as browsing by model
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task makes prompt views addresses with their own caches, safe for every patch.

## Inlined context

> `view=prompts` (+ `single=1`), `prompt=<value>`: a valid key (32 lowercase hex) opens the prompt view; any other `prompt=` value opens the prompt view's unknown-key state with no request (never a fallback to All)
>
> — `sad.md §8, View ↔ address, abridged` · full text: [sad.md](../sad.md)

> `patchSummaries` skips keys with `key[1] === "prompts"` (and the one-group key) before any shape check — their pages hold `groups`, not `items`
>
> — `sad.md §8, Patches, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-03 (US-03) — cross-context

> **Given** the Owner opens a card from a prompt's grid
> **When** the Owner steps with ← / → in the detail dialog
> **Then** the steps go through that prompt's generations only, newest first (loading more of them at the end), the prompt's grid stays behind the dialog, and closing returns to it as for any grid view; deleting moves to the neighbour within the prompt, and deleting its last generation closes onto the «no generations use this prompt any more» state (AC-07)
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-04 (US-03) — happy path

> **Given** the Owner is on «By prompt» or a prompt's grid
> **When** the Owner reloads, goes Back, or opens the gallery's address in a new tab
> **Then** the same view is shown (including the single-use switch), with its own scroll position, and the dialog opened from a prompt's grid still steps within that prompt; the address names the prompt by a short key — the same length for any prompt — never by its text
>
> — `spec.md §5, AC-04, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] view kinds `{kind:"prompts", single}`, `{kind:"prompt", key}` (+ invalid key marker); keys; dialog-state validation
- [ ] summaryPatch skip by key
- [ ] useOrderView: a prompt view is a valid order; the prompts overview maps like «By model»
- [ ] unit tests

## Edge cases

| Case | Behaviour |
|---|---|
| prompt=xyz | prompt view, unknown-key state, no request |
| patch with a prompts cache present | no throw, untouched |

## Definition of Done

- [ ] unit tests pass; existing tests green
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
