---
status: approved         # draft | approved
feature_size: "M"
tool: "code"
updated_at: "2026-10-18"
---

# Screens — text-to-image-openrouter

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks` (each `ui` task cites SCR ids + states), `implement`
> (builds the screen to the declared states) and `review` (the built screen must match this).
> Downstream stages reference **only this manifest** — never the raw Figma / `.pen` file.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below

Home layout (`/`): two columns at `lg` — SCR-01 generate panel (left, ~380px) + SCR-02 gallery (right, fluid); stacked below `md`. Detail (`/generations/:id`) is SCR-03 full width.

## Screens

### SCR-01 — Generate panel

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | provider configured, no job running | Card, Select (model), Textarea (prompt), Select (aspect ratio), Input (seed, number), Input (images, number), Button | wireframe A |
| loading (models) | catalog request in flight | Select disabled with «Loading models…» | wireframe A |
| models error | `listImageModels` 502 / network (AC-14) | Card destructive-tinted panel + Button «Retry» (outline) | wireframe B |
| not configured | `listProviders` → configured=false or 409 PROVIDER_NOT_CONFIGURED (AC-13) | Card with explanation text: «Add OPENROUTER_API_KEY to .env.local and restart gen-img»; form hidden | wireframe C |
| validation | client checks or 400 VALIDATION_ERROR `details.fields` (AC-05) | Input/Textarea/Select with `aria-invalid` + message line under the field | wireframe A (messages under fields) |
| generating / in progress | job running — own submit or another tab (AC-17) | all fields disabled; Button disabled with spinner «Generating…»; muted line «Started 12 s ago» | wireframe D |
| success | job succeeded (AC-01) | latest result: thumbnail(s) linking to SCR-03, «Saved to gallery», Button «Generate again» resets nothing (prompt kept) | wireframe E |
| failure | job failed — provider reason, timeout, no usable image, storage failure, or 409 GENERATION_IN_PROGRESS (AC-06, AC-08) | destructive-tinted panel above the submit button: title + provider message + Button «Dismiss» (ghost); prompt and settings kept | wireframe F |
| empty | N/A: the panel always has a form | — | — |

```text
A — default / validation
+-----------------------------------+
| Generate                          |
| Provider: OpenRouter              |
| Model    [ Seedream 4.5        v ]|
| Prompt   [                       ]|
|          [                       ]|
|          Prompt must not be empty |   <- validation message (aria-invalid)
| Aspect   [ 1:1 v ]  (only if the model supports it)
| Seed     [       ]  (only if supported)
| Images   [ 1 ]      (1..max for the model)
|                     [ Generate ]  |
+-----------------------------------+

B — models error                         C — not configured
+-----------------------------------+    +-----------------------------------+
| ! Model list unavailable          |    | OpenRouter is not configured.     |
|   <reason>          [ Retry ]     |    | Add OPENROUTER_API_KEY to         |
+-----------------------------------+    | .env.local and restart gen-img.   |
                                         | Your gallery is still available.  |
                                         +-----------------------------------+
D — generating                           E — success
+-----------------------------------+    +-----------------------------------+
| (fields disabled)                 |    | (form as A, values kept)          |
| [ (spinner) Generating… ]         |    | Latest: [img][img]  Saved to      |
| Started 12 s ago                  |    |         gallery -> open           |
+-----------------------------------+    +-----------------------------------+
F — failure
+-----------------------------------+
| (form as A, values kept)          |
| ! Generation failed               |
|   Insufficient credits — add      |
|   credits on OpenRouter.          |
|                       [Dismiss]   |
| [ Generate ]                      |
+-----------------------------------+
```

### SCR-02 — Gallery

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | ≥ 1 generation (AC-04, AC-18) | grid of Card tiles: image (lazy), prompt excerpt (2 lines), Badge provider · model, created-at relative; Button «Load more» (outline) when `nextCursor` | wireframe G |
| loading | first page in flight | muted «Loading…» line | — |
| loading more | next page in flight | Button «Load more» disabled with spinner | wireframe G |
| empty | 0 generations (AC-15) | text «No generations yet.» + Button «Write a prompt» (focuses SCR-01 prompt) | wireframe H |
| error | list request fails | destructive-tinted panel «Couldn't load the gallery» + Button «Retry» | — |
| image missing | file request 404 (should not happen; AC-12 guard) | tile shows muted «Image unavailable» placeholder | — |

```text
G — default                                         H — empty
+-----------------------------------------------+   +--------------------------+
| Gallery                                       |   | No generations yet.      |
| +---------+ +---------+ +---------+ +-------+ |   | [ Write a prompt ]       |
| |  img    | |  img    | |  img    | | img   | |   +--------------------------+
| | A cat in| | Neon sky| | ...     | | ...   | |
| | [openrouter · seedream-4.5]  2 min ago    | |
| +---------+ +---------+ +---------+ +-------+ |
|                 [ Load more ]                 |
+-----------------------------------------------+
```

### SCR-03 — Generation detail

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | `getGeneration` 200 (AC-02, AC-09, AC-16, AC-18) | Button «← Gallery» (link); images row (click opens full size in a new tab); Card «Details» with rows: Provider, Model, Prompt (full, selectable), Created, Duration, Cost + Badge status; Card «Parameters»: Requested / Received (N of M images, W×H each) / Accepted «not reported»; Card «Raw exchange» with two collapsible `<pre>` blocks (request, response) labelled «redacted» | wireframe I |
| cost unavailable | `costStatus = unavailable` (AC-07) | Cost row «unavailable» + Badge outline «unavailable» — never «$0» | wireframe I |
| loading | detail in flight | muted «Loading…» | — |
| not found | 404 (AC-12 for addresses) | text «Generation not found.» + Button «← Gallery» | wireframe J |
| error | other failure | destructive-tinted panel + Button «Retry» | — |
| empty | N/A: a generation always has ≥ 1 image | — | — |

```text
I — default
+---------------------------------------------------------------+
| <- Gallery                                                    |
| [ image 1 ] [ image 2 ]                                       |
| Details                         | Parameters                  |
| Provider  OpenRouter            | Requested  aspect 16:9,     |
| Model     bytedance-seed/...    |            seed 42, 4 images|
| Prompt    A cat in a ...        | Received   2 of 4 images    |
| Created   2026-10-18 14:02 UTC  |            1024×576, 1024×576|
| Duration  23.4 s                | Accepted   not reported     |
| Cost      $0.040000 [known]     |                             |
|           (or «unavailable» [unavailable])                    |
| Raw exchange (redacted)                                       |
| > Request   { "model": ..., "prompt": ... }                    |
| > Response  { "data": [{ "$file": "generations/..." }], ... } |
+---------------------------------------------------------------+
J — not found
+------------------------------+
| Generation not found.        |
| [ <- Gallery ]               |
+------------------------------+
```

Cost formatting: micro-USD → `$` with 6 decimals trimmed to at least 2 (`$0.04`, `$0.000125`).

## New components

None — all screens compose the existing inventory (Card, Select, Textarea, Input, Button, Badge). A spinner is the `lucide-react` `Loader2` icon inside Button, per the design-system loading convention.
