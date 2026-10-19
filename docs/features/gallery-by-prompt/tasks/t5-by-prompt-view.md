---
id: T5
title: "Show the gallery grouped by prompt"
layer: "ui"
deps: ["T3", "T4"]
blocks: ["T6"]
acs: ["AC-01", "AC-08"]
files_hint: ["src/web/features/gallery/ByPrompt.tsx", "src/web/features/gallery/ByPrompt.test.tsx", "src/web/features/gallery/GalleryViews.tsx", "src/web/features/gallery/Gallery.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "S"
status: "done"
step: "COMMIT"
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T5 — Show the gallery grouped by prompt

## Place in the sequence

- **Blocked by:** T3 — Read prompt groups, one group and a prompt's pages, T4 — Add the prompt views to the address and the caches · **Blocks:** T6 — Show a prompt's grid and step within it in the dialog · **Wave:** 4.
- **Lane:** shares `Gallery.tsx` with T6 — serialized.

## Why (user story)

> **As an** Owner
> **I want** a view with one card per distinct prompt, showing its latest image, the prompt's beginning, its counts and its models
> **So that** I see which prompts I reused and what they produced
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task builds SCR-11.

## Inlined context

> SCR-11: `Switch` «Include single-use prompts»; group `Card`s: cover, prompt's first two lines (`title` = full text), «N generations · M images», model `Badge`s (≤ 3 + «+K»), the whole card a link to the prompt view; loading more / end / next failed as the grid; none reused «No prompt is used more than once yet.» + the switch; loading; error «Couldn't load your prompts.» + Try again; stale «These may be out of date.»; empty as the main grid
>
> — `screens.md SCR-11, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `GET /api/generations/prompts?cursor=&single=`.

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner has generations with several prompts, some used more than once
> **When** the Owner switches the gallery to «By prompt»
> **Then** it shows one group card per distinct prompt used more than once, the most recently used first (a «Include single-use prompts» switch adds the prompts used once, and is remembered with the view's address): the latest output image of that prompt, the prompt's first two lines (the full text on hover / in the opened view), «N generations · M images», and the models that made them (up to three named, then «+K»); more groups load as the Owner scrolls, like the grid; when no prompt is used more than once yet, it says «No prompt is used more than once yet.» and offers the single-use switch — never «No generations yet» while generations exist
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-08 (US-01) — error

> **Given** «By prompt» can't be loaded right now
> **When** the Owner opens it
> **Then** a plain message with a way to try again is shown and the other views stay usable; groups already shown stay with a note that they may be out of date
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `ByPrompt` with sentinel paging, scroll memory, errors-with-data
- [ ] «By prompt» in the view switch
- [ ] tests per SCR-11 state

## Edge cases

| Case | Behaviour |
|---|---|
| switch on | single-use included; address keeps it |
| none reused | empty state + switch |

## Definition of Done

- [ ] component tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
