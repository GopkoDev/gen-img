---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-19"
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

### SCR-04 — App frame (kit block `sidebar-08`, inset)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | any page, ≥ `md` | `SidebarProvider` › `AppSidebar` (variant inset): header = brand «Ukiyo» (lg menu button, link to `/`); content = `SidebarMenu` with one `SidebarMenuButton` per section (lucide icon + label), inside `<nav aria-label="Sections">`; footer = `ModeToggle` + server status Badge. `SidebarInset`: header row `SidebarTrigger` · vertical `Separator` · `Breadcrumb` (section, › «Generation» on a detail page), then the page | wireframe K |
| current | the shown page belongs to a section (detail → Gallery) | that entry `isActive` (sidebar accent) + `aria-current="page"` | wireframe K |
| no current | not-found page | no entry marked; breadcrumb «Page not found» | — |
| generation running | current job `running` (AC-06) | Generate entry: spinning `Loader2` after the label + visually hidden «generation running» | wireframe K |
| failure waiting | current job `failed` (notice not dismissed) | Generate entry: destructive dot + visually hidden «generation failed — see Generate» | wireframe K |
| collapsed | trigger or `Ctrl/⌘+B` (AC-16) | icon rail; labels as tooltips; indicator still visible on the icon row; footer shows the toggle icon only | wireframe L |
| narrow | below `md` (AC-10) | sidebar hidden; header trigger opens it as a `Sheet`; choosing an entry closes it | wireframe L |
| server unreachable | health fails | footer Badge destructive «server unreachable» | — |
| theme | Light / Dark / System via `ModeToggle` (AC-11) | `DropdownMenu` with three items; icon Sun/Moon | wireframe K |

```text
K — md and up, expanded                              L — collapsed (rail) / narrow (sheet)
+-------------+-------------------------------------+  +---+--------------------------+
| [U] Ukiyo   | [≡] | Generate                      |  | U | [≡] | Gallery            |
|             +-------------------------------------+  | ✦⟳| (page)                   |
| ✦ Generate ⟳| (page)                              |  |[▦]|                          |
|[▦ Gallery  ]|                                     |  |   |                          |
|             |                                     |  | ☾ |  narrow: [≡] opens the   |
| ☾ Theme     |                                     |  +---+  sidebar as a sheet      |
| server ok   |                                     |
+-------------+-------------------------------------+
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

### SCR-06 — Recent generations (on the Generate page)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | ≥ 1 generation (AC-13) | Card «Recent» with a grid of up to 10 square thumbnails (`thumbnail.url`, lazy, `alt` = prompt excerpt), newest first; each a `Link` to `/generations/:id` | wireframe N |
| loading | first request in flight | muted «Loading…» | — |
| empty | 0 generations | muted «No generations yet.» (the form next to it is the call to action) | — |
| error | request fails (AC-15) | destructive-tinted panel «Couldn't load recent generations» + Button «Retry» (outline, sm) | — |
| image missing | file 404 | muted «Image unavailable» square | — |

Layout: ≥ `lg` two columns `grid-cols-[minmax(0,36rem)_minmax(0,1fr)]` — SCR-01 card left, SCR-06 right; below `lg` stacked (SCR-06 under the form). Thumbnails: `grid-cols-5` (two rows of five) at `xl`, `grid-cols-4` otherwise.

```text
N
+-----------------------------+  +---------------------------+
| Generate (SCR-01)           |  | Recent                    |
| ...                         |  | [img][img][img][img][img] |
|                             |  | [img][img][img][img][img] |
+-----------------------------+  +---------------------------+
```

### SCR-01 / SCR-02 / SCR-03 — placement changes only

| Screen | Change | AC |
|---|---|---|
| SCR-01 | left column of the Generate page (SCR-06 to its right); stays mounted (hidden) while another page shows; prompt focused on arrival via «Write a prompt» | AC-05, AC-07 |
| SCR-02 | whole Gallery page with heading «Gallery»; empty-state «Write a prompt» goes to Generate; «Generation deleted.» notice on arrival after a delete | AC-07, AC-08 |
| SCR-03 | «← Gallery» goes to `/gallery`; Gallery entry current | AC-02 |

## New components

- **AppSidebar** (`src/web/components/app-sidebar.tsx`) — the `sidebar-08` block trimmed to our sections; replaces the earlier hand-made NavBar.
- **ModeToggle** + **ThemeProvider** — kit components (dark mode, Vite).
- **RecentGenerations** (`src/web/features/generate/RecentGenerations.tsx`) — composes Card, Button, `Link`.
- **NotFound** (`src/web/components/NotFound.tsx`) — composes Button.
