---
id: T4
title: "Point gallery and detail navigation at the sections"
layer: "ui"
deps: ["T3"]
blocks: []
acs: ["AC-02", "AC-07", "AC-08"]
files_hint: ["src/web/features/gallery/Gallery.tsx", "src/web/features/gallery/GenerationDetail.tsx", "src/web/features/gallery/DeleteGeneration.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T4 — Point gallery and detail navigation at the sections

## Place in the sequence

- **Blocked by:** T3 — Keep the draft across sections and show the running generation in the bar · **Blocks:** —.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** my draft and a running generation to stay as they are when I switch sections, and the actions that start from a generation (re-run, use as input, write a prompt) to bring me to Generate
> **So that** looking at the gallery never costs me the prompt I was writing or hides what is in progress
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: point gallery and detail navigation at the sections.

## Inlined context

> Existing links move: «← Gallery» and «deleted» → `/gallery`; re-run / reuse keep `/?rerun=` / `/?reuse=&output=`.
>
> — `sad.md §4.4` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

No API change.

## Acceptance criteria

### AC-02 — happy path

> **Given** the Owner is on the Gallery or opens a generation's detail page
> **When** the page is shown
> **Then** the Gallery section is marked as current on the detail page too, the detail page's «Gallery» link returns to the Gallery section, and the browser tab title names the current section (e.g. «Gallery · Ukiyo»)
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — cross-context

> **Given** the Owner starts a re-run or «use as input» from a generation's detail page (step 6), or presses «Write a prompt» on the empty gallery
> **When** the action is taken
> **Then** Ukiyo switches to Generate with the navigation bar marking it current: the draft is filled from the source as in step 6, or the prompt field is focused; re-run and use-as-input still work when started again later in the same visit
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — cross-context

> **Given** the Owner deletes a generation from its detail page (step 5)
> **When** the deletion succeeds
> **Then** Ukiyo lands on the Gallery section with the short «Generation deleted.» notice, as before
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] detail back link
- [ ] delete target
- [ ] empty-state CTA

## Edge cases

| Case | Behaviour |
|---|---|
| delete when the notice flag is already in the address | notice shown once, flag removed |

## Definition of Done

- [ ] web tests: «← Gallery» links to `/gallery`; delete lands on `/gallery?deleted=1` with «Generation deleted.»; empty-gallery «Write a prompt» goes to `/?focus=prompt`; existing gallery/detail tests green
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
