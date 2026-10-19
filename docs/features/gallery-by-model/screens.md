---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-19"
---

# Screens — gallery-by-model

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. SCR-02 gains the view switch and the one-model states; SCR-10 is new (`ByModel`).

## Screens

### SCR-02 — Gallery: view switch and one model

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| view switch | always above the grid | a row: `Button` group «All» / «By model» (`aria-pressed`) + a model choice (`Popover` with a list of `Button` rows: model name or id · muted provider · count `Badge`) whose trigger reads «Model: <name>» or «Choose a model» | wireframe A |
| choice loading | models read in flight | rows area: muted «Loading models…» | — |
| choice failed | models read failed (AC-07) | in the popover: destructive-tinted «Couldn't load your models.» + `Button` outline «Try again»; grid unchanged | wireframe A |
| one model | `provider`+`model` in the address (AC-01) | heading line «<model> · <provider> · N generations» + `Button` link «Show all generations»; the grid as in gallery-grid | wireframe B |
| no generations with the model | filtered page empty (AC-06) | «No generations with <model> (<provider>).» + `Button` «Show all generations» | wireframe B |
| default / paging / errors | unchanged from gallery-grid | — | — |

### SCR-10 — Gallery by model (new)

| State | Trigger / condition | Components | Source-ref |
|---|---|---|---|
| default | `view=models` (AC-02) | per model a `section` (`aria-labelledby` its heading): heading «<model>» + muted «<provider> · N generations» + `Button` link «Show all N»; a row of up to four cards (the grid's card component, same badges) | wireframe C |
| loading | groups read in flight | muted «Loading…» | — |
| error | groups read failed (AC-07) | destructive-tinted «Couldn't load the models.» + «Try again» | — |
| empty | no generations at all | «No generations yet.» + «Write a prompt» (as the main grid) | — |

```text
A — view switch                        B — one model
[All] [By model]  [Model: Seedream 4 ▾] │ Seedream 4 · OpenRouter · 12 generations   Show all generations
  ┌ Choose a model ─────────────────┐   │ [card][card][card][card]
  │ Seedream 4      OpenRouter  [12]│   │ …
  │ Gemini Image    Vercel       [5]│   │ (empty) No generations with old/model (OpenRouter). [Show all generations]
  │ ⚠ Couldn't load your models. [Try again]
C — by model
│ Seedream 4                                  Show all 12
│ OpenRouter · 12 generations
│ [card][card][card][card]
│ Gemini 2.5 Flash Image                      Show all 5
│ Vercel AI Gateway · 5 generations
│ [card][card][card][card]
```

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| GalleryViews | feature component (view switch + model choice) on Button/Popover/Badge | n/a — feature-level |
| ByModel | feature component (SCR-10) reusing the grid's card | n/a — feature-level |
