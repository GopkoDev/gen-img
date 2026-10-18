---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-18"
---

# Screens — model-price-preview

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. Only SCR-01 changes: a price line under the model picker and an estimate line above Generate (component `PricePreview`, composed of muted text + `Badge`).

## Screens

### SCR-01 — Generate panel (price + estimate)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| loading | price request in flight after a model is selected | muted text «Price: loading…» | wireframe A |
| per-image | `price.kind = per-image`, min = max (AC-01) | muted «$0.0184 / image» · estimate «Estimate ≈ $0.04 for 2 images» | wireframe B |
| per-image + inputs | input price per image > 0 and inputs attached (AC-02) | estimate «Estimate ≈ $0.05 for 2 images + 1 input» | wireframe B |
| range | min ≠ max (AC-03) | «$0.045–$0.151 / image» · «Estimate ≈ $0.09–$0.31 for 2 images» | wireframe C |
| per-token, history | `per-token` and history count > 0 (AC-05) | Badge outline «priced per token» · «Estimate ≈ $0.12 for 2 images, from your last 5 generations» | wireframe D |
| per-token, no history | `per-token`, count = 0 (AC-05) | Badge «priced per token» · muted «No estimate before generating» | wireframe D |
| unknown | `unknown`, or unknown model (AC-04, AC-10) | muted «Price unknown» — no estimate line | wireframe E |
| couldn't load | price request failed (AC-04) | muted «Price unknown — couldn't load» | wireframe E |
| empty | N/A: shown only when a model is selected | — | — |
| error (blocking) | N/A: pricing never blocks Generate | — | — |

```text
A — loading                        B — per-image
| Model [ Qwen Image 2.1 Turbo v]  | Model [ Qwen Image 2.1 Turbo v]
| Price: loading…                  | $0.0184 / image
| …                                | …
| [ Generate ]                     | Estimate ≈ $0.04 for 2 images
                                   | [ Generate ]
C — range                          D — per-token
| $0.045–$0.151 / image            | [priced per token]
| Estimate ≈ $0.09–$0.31 for 2 …   | Estimate ≈ $0.12 for 2 images, from your last 5 generations
                                   |   (or) No estimate before generating
E — unknown / couldn't load
| Price unknown — couldn't load
| [ Generate ]   (enabled)
```

Formatting: prices per image with 2–4 decimals as needed («$0.0184», «$0.04», «$0.007»); estimates rounded **up** to the cent with «≈» («≈ $0.04»); an estimate below one cent reads «≈ < $0.01».

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| PricePreview | feature component (composes text + `Badge`), not a primitive | n/a — feature-level |
