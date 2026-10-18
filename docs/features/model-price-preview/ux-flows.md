---
status: approved
feature_size: "S"
updated_at: "2026-10-18"
---

# UX flows — model-price-preview

> User flows for every UI-touching §4 user story, produced by `ux-flows` (after `clarify`, before
> `design`). **Always markdown + mermaid `flowchart`.** Screen ids continue the app-wide inventory
> started in [`text-to-image-openrouter/ux-flows.md`](../text-to-image-openrouter/ux-flows.md).

## Platform decisions

- **Posture:** desktop-first — per [`design-system.md`](../../design-system.md).
- **Where prices appear:** inside the generate panel only (SCR-01): a price line under the model picker and an estimate line above the Generate button. The picker's option list shows no prices — fetching a price per option would mean one provider request per model (OpenRouter publishes prices per model), so only the selected model's price is loaded.
- **Never blocking:** a loading, unknown or failed price never disables Generate.
- **Gallery and detail are unchanged:** they keep showing the recorded cost (AC-08).

## Screen inventory

| ID | Screen | Purpose | Entry | Exit |
|---|---|---|---|---|
| SCR-01 | Generate panel | For this feature: price line under the model picker, estimate line above Generate | home | generating |

## Flows

### Flow: US-01 / US-02 / US-03 — See the price and an estimate before generating

```mermaid
flowchart TD
    A[SCR-01 model selected or switched] --> L[price line «loading…»]
    L --> P{Price for this model}
    P -->|one per-image price| PI[«$X / image»]
    P -->|several per-image prices| PR[«$X–$Y / image»]
    P -->|per token| PT[«priced per token»]
    P -->|none published| PU[«price unknown»]
    P -->|lookup failed| PF[«price unknown — couldn't load»]
    PI --> E[estimate line: «Estimate ≈ $N for k images (+ m inputs)»]
    PR --> ER[estimate line as a range]
    PT --> H{Known past costs for this provider + model?}
    H -->|yes| EH[«≈ $N for k images, from your last K generations»]
    H -->|no| EN[«no estimate before generating»]
    PU --> EU[no estimate]
    PF --> EU
    E -->|Owner changes images / inputs| E
    ER -->|Owner changes images / inputs| ER
    EH -->|Owner changes images| EH
    E --> G[Generate stays enabled in every branch]
    ER --> G
    EH --> G
    EN --> G
    EU --> G
```

When the Owner selects a model — or the panel picks one after a provider switch or a re-run — the price line shows «loading…» and then one of five outcomes: a single per-image price, a range, «priced per token», «price unknown», or «price unknown — couldn't load». Per-image prices produce an estimate labelled «Estimate ≈ …» for the current number of images, plus input images where the provider bills them per image; it follows every change of the number of images or attachments. A range price gives a range estimate. Per-token models get an estimate only from the Owner's own past generations with the same provider and model whose cost is known; otherwise the panel says there's no estimate before generating. Unknown prices produce no estimate. Generate is never blocked by any of this.

## AC coverage

| AC | Shown by | Notes |
|---|---|---|
| AC-01 | Flow → PI → E | |
| AC-02 | Flow → E «(+ m inputs)» | |
| AC-03 | Flow → PR → ER | |
| AC-04 | Flow → PU / PF → EU, G | |
| AC-05 | Flow → PT → H → EH / EN | |
| AC-06 | Flow → H | which past generations count — no separate screen state |
| AC-07 | Flow → A (switch) | carry-over of parameters unchanged (step 6) |
| AC-08 | N/A | gallery/detail unchanged — recorded cost only |
| AC-09 | N/A | no UI: a foreign page is refused without any screen |
| AC-10 | Flow → PU | an unknown model has no price |
