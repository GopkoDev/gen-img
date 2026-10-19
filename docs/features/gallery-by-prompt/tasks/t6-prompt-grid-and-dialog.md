---
id: T6
title: "Show a prompt's grid and step within it in the dialog"
layer: "ui"
deps: ["T5"]
blocks: []
acs: ["AC-02", "AC-03", "AC-06", "AC-07"]
files_hint: ["src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/GenerationDialog.tsx", "src/web/features/gallery/ByPrompt.tsx", "src/web/features/gallery/PromptView.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T6 — Show a prompt's grid and step within it in the dialog

## Place in the sequence

- **Blocked by:** T5 — Show the gallery grouped by prompt · **Blocks:** — · **Wave:** 5.
- **Lane:** serialized.

## Why (user story)

> **As an** Owner
> **I want** a prompt group to open a grid of every generation made from that prompt
> **So that** I can compare all its results in one place
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** prompt views to keep their address, scroll and dialog stepping like the other gallery views
> **So that** browsing by prompt works the same way as browsing by model
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task opens everything one prompt produced and keeps the dialog inside it.

## Inlined context

> SCR-02 prompt view: heading = the full prompt (`whitespace-pre-wrap`, collapsed beyond 6 lines with «Show more»), muted «N generations», «Back to prompts», «Show all generations»; unknown key «No generations use this prompt any more.» + both links
>
> — `screens.md SCR-02, abridged` · full text: [screens.md](../screens.md)

> the dialog state's `order` can be a prompt view (stepping loads more of it; a dialog delete takes the neighbour from it and the prompt's last delete closes onto the unknown-key state)
>
> — `sad.md §4, item 3, abridged` · full text: [sad.md](../sad.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /api/generations?prompt=`, `GET /api/generations/prompts/{key}`.

## Acceptance criteria

### AC-02 (US-02) — happy path

> **Given** the Owner is on «By prompt»
> **When** the Owner opens a group card
> **Then** the gallery shows that prompt's grid — every generation made from exactly that prompt, newest first, with the grid's cards and badges — under a heading with the full prompt text and «N generations», and «Back to prompts» / «Show all generations»
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-03 (US-03) — cross-context

> **Given** the Owner opens a card from a prompt's grid
> **When** the Owner steps with ← / → in the detail dialog
> **Then** the steps go through that prompt's generations only, newest first (loading more of them at the end), the prompt's grid stays behind the dialog, and closing returns to it as for any grid view; deleting moves to the neighbour within the prompt, and deleting its last generation closes onto the «no generations use this prompt any more» state (AC-07)
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)
### AC-06 (US-01, US-02) — domain invariant

> **Given** generations are added, re-run or deleted while a prompt view is shown
> **When** the view updates
> **Then** each generation appears in exactly one prompt group (counting single-use prompts, which the default view hides behind the switch); a re-run of a single-use prompt turns it into a reused group at the top of the default view, and deleting a reused group down to one generation moves it behind the switch; counts match what the prompt's grid shows; a re-run with the same prompt joins its group and moves it to the top; a group whose generations are all deleted disappears, and a group's card always shows the latest image that still exists; a cost, tag or comment change shows on the card in every view where it appears
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)
### AC-07 (US-02) — error

> **Given** the gallery's address names a prompt key that matches no generation (mistyped, or every generation of that prompt deleted)
> **When** the gallery is shown
> **Then** it says plainly that no generations use that prompt any more and offers «Back to prompts» and «Show all generations» — not an error page
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] prompt grid + heading from the one-group read + unknown state
- [ ] cards in the prompt grid open with grid = order = the prompt view
- [ ] dialog steps/deletes within the prompt
- [ ] tests

## Edge cases

| Case | Behaviour |
|---|---|
| 404 for the key | unknown state |
| delete the last | closes onto the unknown state |
| re-run of the prompt | joins the group (after refresh) |

## Definition of Done

- [ ] component tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
