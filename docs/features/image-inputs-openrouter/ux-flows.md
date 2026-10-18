---
status: approved            # draft | approved
feature_size: "S"
updated_at: "2026-10-18"
---

# UX flows — image-inputs-openrouter

> User flows for every UI-touching §4 user story, produced by `ux-flows` (after `clarify`, before
> `design`) and read by `design` (evidence for the target-surface + UI-architecture decisions),
> `sequences` (UI-driven flows align on SCR ids), `screens` (details every inventory row) and
> `plan-tests` (the e2e-through-UI paths). **Always markdown + mermaid `flowchart`**, whatever the
> design tool — this artifact is flow-altitude, not visual design.

## Platform decisions

- **Posture:** desktop-first — per [`design-system.md`](../../design-system.md).
- **Navigation shape:** unchanged from step 2 — the generate panel and gallery on the home page, the generation detail on its own page. No new screens: this slice adds an input-images area to the generate panel, an inputs section to the detail page and an inputs hint to gallery tiles.
- **Attaching:** a file picker plus drag-and-drop onto the input-images area, multi-select; attachments show as removable thumbnails in attach order.
- **Reuse:** the SCR ids below are the step-2 screens ([text-to-image-openrouter ux-flows](../text-to-image-openrouter/ux-flows.md)); this feature changes their states, not the set of screens.

## Screen inventory

| ID | Screen | Purpose | Entry | Exit |
|---|---|---|---|---|
| SCR-01 | Generate panel (+ input-images area) | Attach input images within the model's limits, prompt, generate | app home (left area) | SCR-02 gets the new item; SCR-03 via the latest result |
| SCR-02 | Gallery (+ «N inputs» hint on tiles) | Browse generations; see which used inputs | app home (right area) | SCR-03 on a tile click |
| SCR-03 | Generation detail (+ inputs section) | Show inputs in attach order next to the outputs | gallery tile / latest result / direct address | back to SCR-02 |

## Flows

### Flow: US-01 / US-02 — Generate from input images and a prompt

```mermaid
flowchart TD
    A[SCR-01 Generate panel] --> M[Owner picks a model]
    M --> S{Model accepts input images?}
    S -->|no| T[SCR-01 input area hidden - text-only flow as in step 2]
    S -->|yes| I[SCR-01 input area shows the allowed count]
    I --> F[Owner attaches files by picker or drag-and-drop]
    F --> V{Each file a PNG, JPEG, WebP or GIF of at most 10 MB?}
    V -->|no| VR[SCR-01 file refused with reason - other attachments kept] --> F
    V -->|yes| L[SCR-01 thumbnails in attach order]
    L -->|Owner switches model| C{Within the new model's range?}
    C -->|no| CM[SCR-01 extra attachments marked - generate blocked] -->|remove or switch back| L
    C -->|yes| P
    L --> P[Owner writes the prompt and clicks Generate]
    P --> Q{Count within the model's minimum and maximum?}
    Q -->|below minimum| QM[SCR-01 «this model needs at least 1 input image»] --> F
    Q -->|above maximum| QX[SCR-01 «this model takes at most N input images»] --> L
    Q -->|ok| G[SCR-01 «generating», form locked]
    G --> R{Provider answer}
    R -->|saved with input copies| OK[SCR-01 latest result - attachments and prompt kept - SCR-02 new tile with «N inputs»]
    R -->|refused or failed| ER[SCR-01 provider's reason - prompt and attachments kept] --> P
    R -->|storage failed| SE[SCR-01 «could not be stored» + reason - nothing saved] --> P
```

The Owner picks a model. For a text-only model the input area is hidden and step 2's flow applies unchanged. For a model that accepts images, the area states how many it takes, capped at 8. Files arrive via the picker or drag-and-drop. Each one is checked on the spot: a non-supported format (HEIC, PDF, broken file) or a file over 10 MB is refused with the reason, and the rest stay. Accepted files show as thumbnails in attach order. If the Owner switches to a model with a smaller range, the extra attachments are marked (the last-attached first) and Generate is blocked until they are removed or the model is switched back. On Generate, too few inputs for an edit-only model or too many for the model block the request with a plain message. A valid request locks the form. Success shows the result, keeps the attachments and prompt for iteration, and adds a gallery tile with an «N inputs» hint. A provider refusal or failure shows the reason and keeps everything in the form. A storage failure says nothing was saved and why.

### Flow: US-03 — See the inputs of a generation later

```mermaid
flowchart TD
    A[SCR-02 Gallery] --> H{Tile made with inputs?}
    H -->|yes| HN[SCR-02 tile shows «N inputs»]
    H -->|no| HX[SCR-02 tile without hint]
    HN -->|click| D[SCR-03 detail]
    HX -->|click| D
    D --> I{Generation has inputs?}
    I -->|yes| IS[SCR-03 inputs section in attach order, then outputs]
    I -->|no| IN[SCR-03 no inputs section]
    IS -->|input thumbnail| O[input opens full size in a new tab]
```

The gallery marks generations made with inputs with an «N inputs» hint and shows no hint otherwise. The detail page shows an inputs section, in attach order, before the outputs when inputs exist, and no inputs section otherwise. An input thumbnail opens the stored copy at full size.

US-04 (keep attachments contained) has no flow of its own: its outcomes (only the chosen provider receives inputs; only recorded copies are served; no stray files) are server-side and have no screens. They are covered by the request guard and the storage tests, not by UI paths.

## AC coverage

| AC | Shown by | Notes |
|---|---|---|
| AC-01 | Flow US-01 → G → OK; Flow US-03 → IS | |
| AC-02 | Flow US-01 → S → I / T | |
| AC-03 | Flow US-01 → V → VR | |
| AC-04 | Flow US-01 → Q → QX | |
| AC-05 | Flow US-01 → Q → QM | |
| AC-06 | Flow US-01 → R → SE | |
| AC-07 | N/A | server-side: only recorded input copies are served, foreign pages refused; no UI |
| AC-08 | Flow US-01 → C → CM | |
| AC-09 | Flow US-01 → R → ER | |
| AC-10 | Flow US-03 → H → HN / HX | |
| AC-11 | Flow US-01 → S → T | |
