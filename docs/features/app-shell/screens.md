---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-18"
---

# Screens — app-shell

> The canonical **screen manifest** for this feature. SCR-01..03 keep their states from
> [`text-to-image-openrouter/screens.md`](../text-to-image-openrouter/screens.md) and later steps;
> only their placement changes. New: SCR-04 (app frame + navigation bar) and SCR-05 (not found).

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below

Layout: at `md` and up — SCR-04's bar on the left (`w-56`, full height, right border) + the content area (fluid, `p-6`). Below `md` — the bar is a top row (brand + entries inline + status), content below. Content per address: `/` → SCR-01 (max width `xl`), `/gallery` → SCR-02 (full width, «Gallery» heading), `/generations/:id` → SCR-03, anything else → SCR-05.

## Screens

### SCR-04 — App frame + navigation bar

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | any page | brand «Ukiyo» (link to `/`); `<nav aria-label="Sections">` with one link per section: lucide icon + label; server status Badge at the bottom | wireframe K |
| current | the shown page belongs to a section (detail → Gallery) | that entry has `aria-current="page"` + `bg-accent` / `font-medium` | wireframe K |
| no current | not-found page | no entry marked | — |
| generation running | current job `running` (AC-06) | Generate entry shows a spinning `Loader2` after the label + visually hidden «generation running» | wireframe K |
| failure waiting | current job `failed` (notice not dismissed) | Generate entry shows a small destructive dot + visually hidden «generation failed — see Generate» | wireframe K |
| server unreachable | health fails | status Badge destructive «server unreachable» (unchanged texts) | — |
| narrow | below `md` (AC-10) | same entries in a top row; labels kept; status Badge at the row's end | wireframe L |

```text
K — md and up                                  L — below md
+------------+----------------------------+    +---------------------------------+
| Ukiyo      |                            |    | Ukiyo [✦ Generate][▦ Gallery] ok|
|            |   (content area: the       |    +---------------------------------+
| ✦ Generate |    current page)           |    | (content area)                  |
|   ⟳        |                            |    |                                 |
|[▦ Gallery] |  <- current: accent bg     |
|            |                            |
|            |                            |
| server ok  |                            |
+------------+----------------------------+
```

### SCR-05 — Page not found

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | the address is neither a section nor a generation (AC-04) | heading «Page not found.», muted line «This address isn't part of Ukiyo.», Button (asChild link) «Go to Generate» | wireframe M |

```text
M
+------------------------------+
| Page not found.              |
| This address isn't part of   |
| Ukiyo.                       |
| [ Go to Generate ]           |
+------------------------------+
```

### SCR-01 / SCR-02 / SCR-03 — placement changes only

| Screen | Change | AC |
|---|---|---|
| SCR-01 | whole Generate page; stays mounted (hidden) while another page shows; prompt focused on arrival via «Write a prompt» | AC-05, AC-07 |
| SCR-02 | whole Gallery page with heading «Gallery»; empty-state «Write a prompt» goes to Generate; «Generation deleted.» notice on arrival after a delete | AC-07, AC-08 |
| SCR-03 | «← Gallery» goes to `/gallery`; Gallery entry current | AC-02 |

## New components

- **NavBar** (`src/web/components/NavBar.tsx`) — composes lucide icons, Badge and `Link`; states above. Registered in `design-system.md` at implement.
- **NotFound** (`src/web/components/NotFound.tsx`) — composes Button.
