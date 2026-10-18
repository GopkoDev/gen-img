---
id: T3
title: "Keep the draft across sections and show the running generation in the bar"
layer: "ui"
deps: ["T2"]
blocks: ["T4"]
acs: ["AC-05", "AC-06", "AC-07"]
files_hint: ["src/web/features/generate/job.ts", "src/web/features/generate/GeneratePanel.tsx", "src/web/components/NavBar.tsx", "src/web/AppShell.test.tsx"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "done"
step: "COMMIT"
---

# T3 — Keep the draft across sections and show the running generation in the bar

## Place in the sequence

- **Blocked by:** T2 — Render the app frame, the navigation bar and the not-found page (SCR-04, SCR-05) · **Blocks:** T4.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** my draft and a running generation to stay as they are when I switch sections, and the actions that start from a generation (re-run, use as input, write a prompt) to bring me to Generate
> **So that** looking at the gallery never costs me the prompt I was writing or hides what is in progress
>
> — `spec.md §4, US-03, verbatim` · full text: [spec.md](../spec.md)

This task delivers: keep the draft across sections and show the running generation in the bar.

## Inlined context

> Keep the Generate page mounted, hidden while another section shows; the panel keeps its state and its job polling; the bar reads the job from the shared query cache without fetching. Carried sources (`?rerun=`, `?reuse=&output=`, `?focus=prompt`) are applied whenever the address on Generate carries one, then cleared with a `replace` that notifies the router.
>
> — `ADR-0023 §Considered options 1` · full text: [sad.md](../sad.md) · [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

No API change.

## Acceptance criteria

### AC-05 — domain invariant

> **Given** the Owner has written a prompt, chosen settings or attached input images on Generate and has not generated yet
> **When** they switch to the Gallery (or a generation's detail page) and come back to Generate through the navigation bar or the browser's back button
> **Then** the prompt, the settings and the attached images are exactly as they left them
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — domain invariant

> **Given** a generation is in progress
> **When** the Owner is on any section other than Generate
> **Then** the navigation bar shows that a generation is running on the Generate entry; when it finishes it is in the gallery without the Owner reloading, and a failure that is still waiting for the Owner's dismissal is flagged on the Generate entry until it is dismissed
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-07 — cross-context

> **Given** the Owner starts a re-run or «use as input» from a generation's detail page (step 6), or presses «Write a prompt» on the empty gallery
> **When** the action is taken
> **Then** Ukiyo switches to Generate with the navigation bar marking it current: the draft is filled from the source as in step 6, or the prompt field is focused; re-run and use-as-input still work when started again later in the same visit
>
> — `spec.md §5, AC-07, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `job.ts`: `JOB_QUERY_KEY` + `jobQueryOptions`
- [ ] panel reads carried flags whenever the address on Generate carries one; clears with `replace`
- [ ] `?focus=prompt`
- [ ] NavBar job reader (`enabled: false`)

## Edge cases

| Case | Behaviour |
|---|---|
| carried source while a draft exists | replaced, as in step 6 |
| deep link to a detail page | panel mounted hidden; no carried flag applied |

## Definition of Done

- [ ] web tests over `App`: prompt, settings and attachments survive Generate → Gallery → Generate (bar and back); running job → indicator on Generate entry while on Gallery, saved → gallery refetched without reload, failed → flag until dismissed; job polled by one observer only; `/?rerun=` and `/?reuse=&output=` applied on every arrival (twice in one visit), `/?focus=prompt` focuses the prompt; existing panel tests green
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
