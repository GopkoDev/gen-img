---
id: T3
title: "Read prompt groups, one group and a prompt's pages"
layer: "ports"
deps: ["T2"]
blocks: ["T5"]
acs: ["AC-01", "AC-02", "AC-05", "AC-06", "AC-07", "AC-09"]
files_hint: ["src/shared/generations.ts", "src/server/modules/generations/repo.ts", "src/server/modules/generations/service.ts", "src/server/modules/generations/routes.ts", "src/server/modules/generations/by-prompt.int.test.ts", "src/server/modules/generations/nfr.int.test.ts", "src/web/lib/api.ts"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T3 — Read prompt groups, one group and a prompt's pages

## Place in the sequence

- **Blocked by:** T2 — Write the prompt key on save and backfill older generations on boot · **Blocks:** T5 — Show the gallery grouped by prompt · **Wave:** 3.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a view with one card per distinct prompt, showing its latest image, the prompt's beginning, its counts and its models
> **So that** I see which prompts I reused and what they produced
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)
> **As an** Owner
> **I want** a prompt group to open a grid of every generation made from that prompt
> **So that** I can compare all its results in one place
>
> — `spec.md §4, US-02, verbatim` · full text: [spec.md](../spec.md)

This task gives the prompt views their data.

## Inlined context

> `count(*)`, `sum(images_received)`, `max(id)`; `HAVING count(*) > 1` unless `single=1`; cursor = the last group's `latestId` (`HAVING max(id) < ?`; ids are unique, so no ties); response `{ groups, nextCursor }`; models: `SELECT provider, model … GROUP BY provider, model ORDER BY max(id) DESC LIMIT 3` + the total distinct count
>
> — `sad.md §8, Groups read, verbatim` · full text: [sad.md](../sad.md)

> `GET /generations/prompts/:key` → the same `PromptGroup` or `NOT_FOUND`
>
> — `sad.md §8, One group, abridged` · full text: [sad.md](../sad.md)

> `prompt` must be 32 lowercase hex → else 400; an unknown key → empty page … `/generations/prompts` before `/generations/:id`
>
> — `sad.md §8, Validation + Route order, abridged` · full text: [sad.md](../sad.md)

> «By prompt» page | a page of 24 groups … ≤ 300 ms p95 server time with 1 000 generations across 200 prompts, each with 10 tags and a comment … A prompt's page | any page of 24 generations of one prompt ≤ 300 ms p95 server time with the same seed
>
> — `spec.md §6, rows 1–2, abridged` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Reads `generations` via `generations_by_prompt`.

## API contract

- `GET /api/generations?prompt=<key>` (not with provider/model) → `GenerationPage`.
- `GET /api/generations/prompts?cursor=&limit=&single=0|1` → `{ groups: PromptGroup[], nextCursor }`.
- `GET /api/generations/prompts/{key}` → `PromptGroup` | `404 NOT_FOUND`.
- `400 VALIDATION_ERROR`, `403 FORBIDDEN`.

— `contracts/openapi.yaml`, abridged

## Acceptance criteria

### AC-01 (US-01) — happy path

> **Given** the Owner has generations with several prompts, some used more than once
> **When** the Owner switches the gallery to «By prompt»
> **Then** it shows one group card per distinct prompt used more than once, the most recently used first (a «Include single-use prompts» switch adds the prompts used once, and is remembered with the view's address): the latest output image of that prompt, the prompt's first two lines (the full text on hover / in the opened view), «N generations · M images», and the models that made them (up to three named, then «+K»); more groups load as the Owner scrolls, like the grid; when no prompt is used more than once yet, it says «No prompt is used more than once yet.» and offers the single-use switch — never «No generations yet» while generations exist
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)
### AC-02 (US-02) — happy path

> **Given** the Owner is on «By prompt»
> **When** the Owner opens a group card
> **Then** the gallery shows that prompt's grid — every generation made from exactly that prompt, newest first, with the grid's cards and badges — under a heading with the full prompt text and «N generations», and «Back to prompts» / «Show all generations»
>
> — `spec.md §5, AC-02, verbatim` · full text: [spec.md](../spec.md)
### AC-05 (US-01, US-02) — domain invariant

> **Given** two generations' prompts differ in anything — a space, a line break, letter case
> **When** the gallery groups by prompt
> **Then** they are two groups; generations with exactly the same prompt text are one group, whatever model, provider or parameters they used
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)
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
### AC-09 (US-01) — authorization

> **Given** Ukiyo is running
> **When** a page from another site in the Owner's browser asks Ukiyo for the prompt groups or a prompt's generations
> **Then** Ukiyo refuses, like every other Ukiyo request
>
> — `spec.md §5, AC-09, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] shared schemas `PromptGroup`, `PromptGroupPage`; list query `prompt`
- [ ] repo `listPage({…, promptKey})`, `promptGroups`, `promptGroup(key)`
- [ ] routes (prompts routes before `:id`)
- [ ] api client `promptGroups(cursor, single)`, `promptGroup(key)`, `generations(…, { prompt })`
- [ ] integration tests + nfr rows

## Edge cases

| Case | Behaviour |
|---|---|
| prompts differing by case | two groups |
| single=0 | only count > 1 |
| group's latest deleted | cover = new latest |
| prompt + provider together | 400 |
| unknown key | empty page / 404 for one group |

## Definition of Done

- [ ] integration + nfr tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
