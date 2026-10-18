---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-19"
---

# Screens — model-picker-preferences

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. SCR-07 is new (the open model list, component `ModelPicker`, ADR-0028); SCR-01 changes only in its closed picker and its automatic model choices.

## Screens

### SCR-07 — Model picker, open list (new)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default, grouped | ≥ 1 visible favorite (AC-04) | `Popover` · group label «Favorites» then «All models» (muted xs) · rows: `Button` ghost «choose» (name · muted id · muted short price) + `Button` ghost icon ★ (`aria-pressed`, `aria-label` «Favorite <name>») | wireframe A |
| default, plain | no favorites (AC-04) | same rows, no group labels | wireframe B |
| price loading | entry's price in flight (AC-01) | muted «…» in a fixed-width price slot (no layout shift) | wireframe A |
| price states | per-image / range / per-token / unknown / couldn't load (AC-01, AC-02) | muted `$X / image` · `$X–$Y / image` · `Badge` outline «priced per token» · muted «price unknown» · muted «price unknown — couldn't load» | wireframe A |
| ★ toggled | Owner activates ★ (AC-03) | filled ★ (`aria-pressed=true`); row moves to its group; list stays open; focus stays on that ★ | wireframe A |
| ★ save failed | write refused or unreachable (AC-05; contract 400/404/409/502) | ★ back to previous state · destructive-tinted line at the top of the list «Couldn't save the favorite — try again.» (cleared on the next successful toggle or on close) | wireframe C |
| hidden but selected | the selected model is hidden (AC-10) | its row first in «All models», muted label «hidden» after the name | wireframe D |
| preferences unreadable | preferences read failed (AC-13) | plain list of every model incl. hidden · muted line at the top «Favorites couldn't be loaded.» · ★ buttons disabled | wireframe E |
| empty | N/A: the trigger is disabled until the model list is in; a provider with no models already shows the panel's existing notice (step 2) | — | — |
| validation | N/A: the list takes no input | — | — |

```text
A — grouped, prices arriving              B — plain (no favorites)
┌ Model ────────────────────────────┐     ┌──────────────────────────────────┐
│ FAVORITES                         │     │ Gemini 2.5 Flash Image  $0.039 ☆ │
│ Gemini 2.5 Flash Image            │     │   google/gemini-2.5-flash-image  │
│   google/gemini-…   $0.039 / img ★│     │ GPT-5 Image             …      ☆ │
│ ALL MODELS                        │     └──────────────────────────────────┘
│ GPT-5 Image                       │
│   openai/gpt-5-image   [per token]☆│
│ Seedream 4                        │
│   bytedance/…     $0.03–$0.06 /img☆│
│ FLUX 2 Pro                        │
│   black-forest-labs/…        …    ☆│
└───────────────────────────────────┘
C — ★ save failed                         D — hidden but selected
│ ⚠ Couldn't save the favorite — try again. │ ALL MODELS
│ GPT-5 Image …                ☆ (reverted)  │ Old Model  hidden   price unknown ☆
E — preferences unreadable
│ Favorites couldn't be loaded.
│ every model, plain, ★ disabled
```

Keyboard (SAD §8): Enter/Space/↓ on the trigger opens with focus on the selected row (else the first); ↑/↓ move between rows' «choose» buttons; Tab moves to the row's ★; Enter/Space on ★ toggles; Enter on «choose» selects and closes; Escape closes; focus returns to the trigger.

### SCR-01 — Generate panel (closed picker, automatic choices)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | a model is selected | `Button` outline (picker trigger with `aria-expanded`) showing the model name + ★ filled when it is a favorite; price line (step 7 `PricePreview`) below, unchanged | wireframe F |
| loading | model list in flight | trigger disabled «Loading models…» (unchanged) | wireframe F |
| auto-picked | first load / provider switch / re-run model not offered / reuse needs inputs (AC-11) | trigger shows the picked model — first suitable favorite, else first suitable visible model | wireframe F |
| none suitable | no visible model fits (AC-11) | trigger «Choose a model» + the panel's existing `Notice` naming the kind of model needed (step 6 wording) | wireframe F |
| hidden selected | selected model is hidden (AC-10) | trigger shows the name + muted «hidden» | wireframe F |
| error | N/A for this feature: model-list errors keep step 2's panel error (unchanged) | — | — |
| empty | N/A: covered by step 2's «no models» notice | — | — |

```text
F — closed picker
| Model [ ★ Gemini 2.5 Flash Image        v ]
| $0.039 / image                 (step 7 price line)
| Model [ Old Model  hidden               v ]
| Model [ Choose a model                  v ]  ⓘ No OpenRouter model takes input images — switch provider.
```

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| Popover (shadcn primitive) | the select can't hold a separate ★ control per entry (ADR-0028); DropdownMenu reads as a command menu and closes on select | registered by implement |
| ModelPicker | feature component (trigger + Popover + rows), reused by the Models page later | n/a — feature-level |
