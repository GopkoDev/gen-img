---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-19"
---

# Screens — gallery-by-prompt

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. SCR-11 is new (`ByPrompt`); SCR-02 gains the prompt view and the switch gains «By prompt».

## Screens

### SCR-11 — Gallery by prompt (new)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | reused prompts exist (AC-01) | above: `Switch` «Include single-use prompts» (labelled); grid of group `Card`s (same columns as the grid): cover image (the latest output, the card's image area, `Image unavailable` fallback), prompt's first two lines (`line-clamp-2`, `title` = full text), muted «N generations · M images», model `Badge`s (≤ 3 + «+K»); the whole card is a link to the prompt view | wireframe A |
| loading more / end / next page failed | as the grid (gallery-grid SCR-02) | «Loading more…», «That's everything», «Couldn't load more.» + Try again | — |
| none reused | no group with > 1 generation (AC-01) | «No prompt is used more than once yet.» + the switch | wireframe B |
| loading | first page in flight | muted «Loading…» | — |
| error | first page failed (AC-08) | destructive-tinted «Couldn't load your prompts.» + Try again | — |
| stale | refresh failed with groups shown (AC-08) | groups kept + muted «These may be out of date.» + Try again | — |
| empty | no generations at all | «No generations yet.» + «Write a prompt» | — |

### SCR-02 — Gallery: prompt view

| State | Trigger / condition | Components | Source-ref |
|---|---|---|---|
| prompt view | `prompt=<key>` (AC-02) | heading: the full prompt (`whitespace-pre-wrap`, collapsed beyond 6 lines with «Show more»), muted «N generations», `Button` link «Back to prompts», «Show all generations»; then the grid | wireframe C |
| unknown key | page empty (AC-07) | «No generations use this prompt any more.» + «Back to prompts» + «Show all generations» | wireframe C |
| view switch | always | «All» / «By model» / «By prompt» (`aria-pressed`) + the model choice | — |

```text
A — by prompt                                  B — none reused
[ ] Include single-use prompts                 │ No prompt is used more than once yet.  [ ] Include single-use prompts
┌───────────┐ ┌───────────┐
│  cover    │ │  cover    │
│ A neon    │ │ Portrait  │
│ city at…  │ │ of a…     │
│ 5 gen · 9 img│ 3 gen · 3 img│
│[seedream][gemini]+1      │
└───────────┘ └───────────┘
C — prompt view
│ A neon city at night, rain,
│ reflections on wet asphalt …   Show more
│ 5 generations    Back to prompts · Show all generations
│ [card][card][card][card][card]
│ (unknown) No generations use this prompt any more. [Back to prompts] [Show all generations]
```

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| ByPrompt | feature component (SCR-11) on Card/Badge/Switch | n/a — feature-level |
