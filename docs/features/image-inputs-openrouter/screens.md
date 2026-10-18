---
status: approved         # draft | approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-18"
---

# Screens — image-inputs-openrouter

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks` (each `ui` task cites SCR ids + states), `implement`
> (builds the screen to the declared states) and `review` (the built screen must match this).
> Downstream stages reference **only this manifest** — never the raw Figma / `.pen` file.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. The states listed here are **added** to the step-2 states of the same screens ([text-to-image-openrouter screens.md](../text-to-image-openrouter/screens.md)); unlisted step-2 states are unchanged.

## Screens

### SCR-01 — Generate panel: input-images area

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| hidden | the chosen model has no `params.inputs` (AC-02, AC-11) | — (area not rendered) | — |
| empty | model takes inputs, none attached (AC-02) | dashed drop zone (div + Tailwind) with text «Drop images here or» + Button «Choose files» (outline, opens a hidden multi-file input) + muted «Up to N images · PNG, JPEG, WebP, GIF · max 10 MB each» (or «1 to N images» when min ≥ 1) | wireframe A |
| attached | ≥ 1 file accepted (AC-01) | row of 64 px thumbnails in attach order, each with a Button «Remove» (ghost, icon `X`, aria-label «Remove <file name>»), counter «2 / 4» | wireframe B |
| file refused | a file isn't a supported picture or > 10 MB (AC-03) | inline destructive line per refused file under the area: «photo.heic — not a supported image» / «big.png — larger than 10 MB»; other thumbnails stay | wireframe B |
| over limit | count above the model's max, e.g. after a model switch (AC-04, AC-08) | thumbnails beyond the max get a destructive ring + Badge «not sent» (destructive); message «This model takes at most N input images — remove M»; Generate disabled | wireframe C |
| below minimum | model min ≥ 1 and none attached, on Generate (AC-05) | field error under the area «This model needs at least 1 input image» | wireframe A |
| server field errors | 400 with `inputs` / `inputs.N` keys | same message line as «file refused» / «over limit» | — |
| generating | job running | drop zone and Remove buttons disabled | — |
| provider failure | job failed (AC-09) | step-2 failure panel; thumbnails and prompt kept | — |

```text
A — empty (model takes inputs)              B — attached + one refused
+-----------------------------------+       +-----------------------------------+
| Input images                      |       | Input images              2 / 4   |
| +-------------------------------+ |       | [img x] [img x]                   |
| |  Drop images here or          | |       | +- - - - - - - - - - - - - - - -+ |
| |  [ Choose files ]             | |       | | Drop images here or [Choose]  | |
| +-------------------------------+ |       | +- - - - - - - - - - - - - - - -+ |
| Up to 4 images · PNG, JPEG, WebP, |       | ! photo.heic — not a supported    |
| GIF · max 10 MB each              |       |   image                           |
| (below minimum: «needs at least 1»)|      +-----------------------------------+
+-----------------------------------+
C — over limit after switching to a 1-image model
+-----------------------------------+
| Input images              3 / 1   |
| [img x] [img x](not sent) [img x](not sent)
| ! This model takes at most 1 input image — remove 2
| [ Generate ] (disabled)           |
+-----------------------------------+
```

### SCR-02 — Gallery tile: inputs hint

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| with inputs | `inputsCount > 0` (AC-10) | Badge outline «N inputs» (icon `ImageIcon`) next to the provider · model badge | wireframe D |
| without inputs | `inputsCount = 0` | no badge (step-2 tile) | — |
| empty / error | N/A: unchanged from step 2 | — | — |

```text
D
+---------+
|  img    |
| A cat in|
| [openrouter · qwen…] [2 inputs]  2 min ago
+---------+
```

### SCR-03 — Generation detail: inputs section

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| with inputs | `inputs.length > 0` (AC-01) | Card «Inputs» above the outputs: thumbnails in attach order, each a link opening the copy in a new tab, caption = original file name (or «input N») + W×H; raw request shows `{ "$file": "generations/<id>/input-N.png" }` | wireframe E |
| without inputs | text-only generation (AC-11) | no Inputs card | — |
| input image missing | file 404 (shouldn't happen — AC-07 guard) | muted «Image unavailable» placeholder | — |
| empty / error | N/A: unchanged from step 2 | — | — |

```text
E
+---------------------------------------------------------------+
| <- Gallery                                                    |
| Inputs                                                        |
| [ in 1 ] [ in 2 ]                                             |
| cat.png 1024×1024   sky.jpg 800×600                           |
| Outputs                                                       |
| [ image 1 ] [ image 2 ]                                       |
| Details | Parameters | Raw exchange … (step 2)                |
+---------------------------------------------------------------+
```

## New components

None — all states compose the existing inventory (Button, Badge, Card, Input) plus Tailwind layout; the drop zone is a styled container around a hidden native file input, not a new reusable primitive.
