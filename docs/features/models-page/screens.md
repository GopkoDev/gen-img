---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-19"
---

# Screens — models-page

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. SCR-08 is new (component `ModelsPage`); SCR-01 changes only in its «none suitable» notice.

## Screens

### SCR-08 — Models page (new)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | ≥ 1 provider configured, its list and preferences loaded (AC-01) | page `h2` «Models» · per provider a `Card` with the provider name and a model count · `Table` (NEW primitive): Name (name + muted id) · Price · Aspect ratios · Seed · Images · Inputs · ★ (`Button` ghost icon, `aria-pressed`, «Favorite <name>») · «Show in picker» (`Switch` NEW primitive, labelled «Show <name> in picker») | wireframe A |
| loading | model list in flight | muted «Loading models…» inside the provider card | wireframe A |
| price loading | row in view, price in flight (AC-01) | muted «…» in the Price cell | wireframe A |
| price states | per-image / range / per-token / unknown / couldn't load | muted `$X / image` · `$X–$Y / image` · `Badge` outline «priced per token» · muted «price unknown» · muted «price unknown — couldn't load» | wireframe A |
| hidden row | `hidden` (AC-02) | row muted (`text-muted-foreground`), `Badge` outline «Hidden» after the name, switch off | wireframe A |
| toggle save failed | write refused or unreachable (AC-05) | that toggle back to its previous state · destructive-tinted line under the row's name «Couldn't save — try again.» (cleared on that row's next success) | wireframe B |
| list error | provider list failed (AC-06) | destructive-tinted panel «Couldn't load the <provider> models.» + `Button` outline «Try again» in place of the table | wireframe C |
| not configured | provider has no key (AC-07) | muted «<provider> isn't configured — add its key to `.env.local`.» in the card, no table | wireframe C |
| none configured | no provider configured (AC-07) | empty state: «No provider is configured yet. Add an OpenRouter or Vercel AI Gateway key to `.env.local` and restart Ukiyo.» | wireframe D |
| preferences unreadable | preferences read failed (AC-14) | muted line above the table «Favorites and hidden models couldn't be loaded.» · ★ and switches disabled · no «No longer offered» | wireframe C |
| no longer offered | kept preferences of models not in a loaded list (AC-08) | under the table: muted heading «No longer offered» · rows: model id · `Badge` outline «Favorite» / «Hidden» · `Button` ghost «Forget» (spinner while saving) | wireframe E |
| forget failed | write failed (AC-08) | row stays · «Couldn't forget — try again.» | wireframe E |
| empty | N/A: a provider with zero image models shows its card with «No image models.» (muted) | — | — |
| validation | N/A: the page takes no typed input | — | — |

```text
A — default
Models
┌ OpenRouter · 42 models ─────────────────────────────────────────────────────────────────┐
│ Name                         Price              Aspect ratios     Seed  Images  Inputs ★  Show │
│ Gemini 2.5 Flash Image       $0.039 / image     1:1, 16:9, …      —     up to 1 0–3    ★  [●] │
│   google/gemini-2.5-flash-image                                                              │
│ GPT-5 Image                  [priced per token] 1:1, 3:2, 2:3     —     up to 4 0–8    ☆  [●] │
│ Old Flux  [Hidden]           …                  —                 yes   up to 4 —      ☆  [○] │
│ No longer offered                                                                           │
│   retired/old-model  [Favorite]                                              [ Forget ]      │
└─────────────────────────────────────────────────────────────────────────────────────────┘
B — save failed (row)            C — provider states
│ GPT-5 Image                    │ ⚠ Couldn't load the Vercel AI Gateway models. [Try again]
│ ⚠ Couldn't save — try again.   │ Vercel AI Gateway isn't configured — add its key to .env.local.
                                 │ Favorites and hidden models couldn't be loaded. (toggles disabled)
D — none configured              E — no longer offered
│ No provider is configured yet… │ retired/old-model [Favorite] [Forget] ⚠ Couldn't forget — try again.
```

Keyboard: the table is plain tab order — ★ then the switch on each row; Space toggles the switch, Enter/Space the ★; «Try again» and «Forget» are buttons.

### SCR-01 — Generate panel («none suitable» notice)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| none suitable, hidden exist | no visible model suits the automatic choice but a hidden one would (AC-13) | existing `Notice`: «The <provider> models that take input images are hidden — show one on the Models page.» (or «All <provider> models are hidden — show one on the Models page.») with «Models page» as a link | wireframe F |
| none suitable, none exist | unchanged step 6/9 wording | existing `Notice` | — |
| default / other states | unchanged (step 9 manifest) | — | — |

```text
F — notice
| Model [ Choose a model v ]  ⓘ The OpenRouter models that take input images are hidden — show one on the Models page.
```

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| Table (shadcn primitive) | the inventory has no tabular primitive; a model comparison is tabular | registered by implement |
| Switch (shadcn primitive) | an on/off setting that acts at once; a checkbox would read as a form field to submit | registered by implement |
| ModelsPage | feature component (section page) | n/a — feature-level |
