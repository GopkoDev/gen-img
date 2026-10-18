---
status: approved
feature_size: "M"
tool: "code"
updated_at: "2026-10-18"
---

# Screens — rerun-and-reuse

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`. Only the states this feature adds
> or changes are listed; everything else on SCR-01 / SCR-03 is unchanged from the shipped features.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below

## Screens

### SCR-01 — Generate panel (draft from a source)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| loading source | opened with a re-run / reuse source in the address, source being read | muted «Loading the source generation…» line above the form | — |
| re-run draft | source loaded, provider configured, model offered (AC-01, AC-06) | muted «Started from» line: «Re-run of <prompt excerpt>» as a link to SCR-03 + `Button variant="ghost" size="sm"` «×» (aria-label «Remove the link to the source»); below it muted «Sends the same inputs again — results can differ.»; form fields filled; stored input images shown like attachments (thumbnail + name + remove) | wireframe A |
| reuse draft | reuse source loaded (AC-03) | «Started from» line: «Made from output N of <prompt excerpt>»; one stored image attached; prompt empty | wireframe A |
| model not available | source model not offered / provider not configured (AC-10) | destructive-tinted notice «The original model <id> isn't available — choose another. The prompt, parameters and images are kept.» | wireframe B |
| removed parameters | model or provider switched, some values unsupported (AC-05) | muted info line under the model select: «Not supported by this model: seed, aspect ratio. Images lowered to 1.» — cleared on the next change | wireframe B |
| no model takes inputs | reuse on a provider without input-capable models (AC-11) | destructive-tinted notice «No <provider> model takes input images — switch provider.»; Generate disabled | — |
| source gone | source missing on load or at start (AC-08) | destructive-tinted notice «The source generation no longer exists.» + `Button variant="outline" size="sm"` «Remove the link»; prompt and settings kept | wireframe C |
| input refused | a stored reference rejected (AC-13) or unusable (AC-09) at start | existing input error line under the input images («input 2: Not an image stored by gen-img») | — |
| in progress | a generation runs (AC-14) | unchanged «Generating…» state | — |
| empty | N/A: a draft from a source is never empty | — | — |

```text
A — re-run draft                         B — after switching model
+-----------------------------------+    +-----------------------------------+
| Started from: Re-run of «A cat…» × |    | Started from: Re-run of «A cat…» × |
| Sends the same inputs again —     |    | Model [ Muse Image            v ] |
| results can differ.               |    | Not supported by this model:      |
| Provider [ OpenRouter          v ] |    | seed, aspect ratio. Images → 1.   |
| Model    [ Qwen Image 2.1      v ] |    | ! The original model … isn't      |
| Prompt   [ A cat in a neon city ] |    |   available — choose another.     |
| Input images  [img][img]  2 / 4   |    +-----------------------------------+
| Aspect [16:9] Seed [42] Images [2]|
| [ Generate ]                      |    C — source gone
+-----------------------------------+    +-----------------------------------+
                                         | ! The source generation no longer |
                                         |   exists.     [Remove the link]   |
                                         +-----------------------------------+
```

### SCR-03 — Generation detail (actions + lineage)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | detail loaded (AC-01, AC-03) | `Button variant="outline"` «Re-run» next to Delete (lucide `RotateCcw`); under each output image a `Button variant="ghost" size="sm"` «Use as input» (lucide `ImagePlus`) | wireframe D |
| reuse refused | output > 10 MB or not a supported picture (AC-09) | muted destructive text under that image: «Can't be used as an input: larger than 10 MB»; nothing navigates | wireframe D |
| lineage — source | generation has a source (AC-02, AC-03) | `Card` «Lineage»: «Re-run of» / «Made from output N of» + link (prompt excerpt) | wireframe D |
| lineage — source deleted | source no longer exists (AC-07) | same row, text «source deleted», no link | wireframe D |
| lineage — derived | other generations made from it (AC-04, AC-15) | list in the same `Card`: «Re-run» / «Output N reused» + link + relative time, newest first; «and N more» when total > 50 | wireframe D |
| no lineage | no source and nothing derived | Lineage card hidden | — |
| loading / error / not found | unchanged from earlier features | — | — |

```text
D — detail with lineage
+---------------------------------------------------------------+
| <- Gallery                         [Re-run] [Delete]          |
| [ image 1 ]          [ image 2 ]                              |
| [Use as input]       [Use as input]                           |
|                      Can't be used as an input: larger than 10 MB
| Lineage                                                       |
|  Made from output 2 of «A cat in a neon city»  (or: source deleted)
|  Derived:  Re-run · «A cat in…» · 2 min ago                   |
|            Output 1 reused · «Make it blue» · 1 h ago         |
|            and 3 more                                         |
+---------------------------------------------------------------+
```

## New components

None — all states compose the existing inventory (Button, Card, Badge, text lines) and lucide icons, as the earlier features do.
