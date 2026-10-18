---
status: approved         # draft | approved
feature_size: "M"
tool: "code"
updated_at: "2026-10-18"
---

# Screens — curate-gallery

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks` (each `ui` task cites SCR ids + states), `implement`
> (builds the screen to the declared states) and `review` (the built screen must match this).
> Downstream stages reference **only this manifest** — never the raw Figma / `.pen` file.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below

## Screens

### SCR-01 — Gallery (extended)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | ≥ 1 generation (AC-03) | existing tile + up to 3 `Badge variant="outline"` tags, `Badge` «+N» when more, a `MessageSquare` icon (lucide) with `aria-label="Has a comment"` when a comment exists | wireframe A |
| deleted notice | arrived from a confirmed deletion (AC-04) | muted text line «Generation deleted.» above the grid, cleared on the next navigation | wireframe A |
| empty | 0 generations | unchanged from step 2 (text + «Write a prompt») | — |
| error | list fails | unchanged from step 2 | — |

```text
A — default (+ deleted notice)
+-----------------------------------------------+
| Gallery                                       |
| Generation deleted.                           |  <- only right after a deletion
| +---------+ +---------+                       |
| |  img    | |  img    |                       |
| | A cat … | | Neon …  |                       |
| | [openrouter · model] [cost pending]         |
| | [portrait][neon city][wip] +2  (💬)         |  <- tags + comment marker
| | 2 min ago                                   |
+-----------------------------------------------+
```

### SCR-02 — Generation detail (extended)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | detail loaded (AC-01…AC-03) | new Card «Notes» with: comment text (`whitespace-pre-wrap`, plain text) or «No comment yet» + Button «Add comment» / «Edit»; tag list as `Badge variant="secondary"` each with an × Button (ghost, `aria-label="Remove tag <tag>"`) + Input «Add a tag» (Enter adds); header Button «Delete» (destructive, outline) | wireframe B |
| comment editing | Add/Edit pressed | Textarea (rows 5) + counter «N / 2000» + Button «Save» + Button «Cancel» (ghost) | wireframe C |
| comment saving | Save in flight | Save disabled with spinner | — |
| comment validation | > 2 000 chars (AC-06) | Textarea `aria-invalid` + message «Comment must be at most 2 000 characters»; text kept | wireframe C |
| tag validation | invalid tag / 11th tag (AC-07, AC-08) | Input `aria-invalid` + message under it («Tags may contain letters, digits, spaces, - and _ (1–32 characters)» / «A generation can have at most 10 tags»); input kept | wireframe B |
| tag saving | add/remove in flight | Input disabled; the tag × disabled | — |
| delete failed | STORAGE_ERROR (AC-09) | destructive-tinted panel above Notes: «Couldn't delete this generation» + reason; everything else unchanged | — |
| no longer exists | NOT_FOUND on load or on any curation action (AC-14) | text «This generation no longer exists.» + Button «← Gallery» (replaces step 2's «Generation not found.») | wireframe D |
| loading / error | unchanged from step 2 | — | — |
| empty | N/A: a generation always has ≥ 1 image; empty notes are the default state | — | — |

```text
B — default                                   C — editing a comment
+-------------------------------------------+ +-------------------------------------+
| <- Gallery                   [ Delete ]   | | Notes                               |
| [ image 1 ] [ image 2 ]                   | | [ Good composition — try a warmer ] |
| Notes                                     | | [ palette next                    ] |
| Good composition — try a warmer palette   | | 41 / 2000                           |
| next                              [Edit]  | |              [ Cancel ] [ Save ]    |
| Tags: [portrait ×] [neon city ×]          | +-------------------------------------+
| [ Add a tag…               ]  (Enter)     |
| Tags may contain letters, digits, …       |  <- validation message
| Details …  Parameters …  Raw exchange …   |
+-------------------------------------------+
D — no longer exists
+------------------------------------+
| This generation no longer exists.  |
| [ <- Gallery ]                     |
+------------------------------------+
```

### SCR-03 — Delete confirmation dialog (new screen, existing component)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | Delete pressed (AC-04) | `Dialog` with title «Delete this generation?», body: prompt excerpt (first 80 chars, quoted) + «Its images and input copies will be removed from this machine. This can't be undone.», Button «Cancel» (outline) + Button «Delete» (destructive) | wireframe E |
| deleting | Confirm in flight | both buttons disabled, Delete with spinner; dialog can't be dismissed | — |
| cancelled | Cancel / Esc / overlay click (AC-05) | dialog closes, nothing sent | — |
| error | STORAGE_ERROR or NOT_FOUND | dialog closes; SCR-02 shows «delete failed» or «no longer exists» | — |

```text
E — confirm
+---------------------------------------------------+
| Delete this generation?                           |
| "A cat in a neon city, cinematic lighting, …"     |
| Its images and input copies will be removed from  |
| this machine. This can't be undone.               |
|                           [ Cancel ] [ Delete ]   |
+---------------------------------------------------+
```

### SCR-04 — Generate panel latest result (existing)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | latest succeeded generation exists | unchanged from step 2 | — |
| gone | its generation was deleted (AC-12) | the latest-result block is not rendered (job query returns no succeeded result; a NOT_FOUND detail also hides it) | — |
| error / empty | N/A: the block either shows a saved generation or nothing | — | — |

## New components

None — all screens compose the existing inventory (Card, Badge, Button, Input, Textarea, Dialog) plus a lucide icon, per the design-system conventions.
