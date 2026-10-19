---
status: approved
feature_size: "S"
tool: "code"
updated_at: "2026-10-19"
---

# Screens — gallery-grid

> The canonical **screen manifest** — every screen in every state — produced by `screens` (between
> `api` and `tasks`) and read by `tasks`, `implement` and `review`.

## Source

- **Tool:** code (from `docs/design-system.md`)
- **File:** inline wireframes below. Only SCR-02 changes (new feature component `CardBadges`).

## Screens

### SCR-02 — Gallery (badges, auto-paging)

| State | Trigger / condition | Components (from the inventory) | Source-ref |
|---|---|---|---|
| default | ≥ 1 page loaded (AC-01) | grid of `Card`s; over each preview a one-line strip along the bottom (`bg-background`, `text-foreground`, `text-xs`): `Badge` secondary cost · `Badge` outline duration · `Badge` outline size · `Badge` outline count when > 1; below the preview: prompt (2 lines), tags, comment marker, `provider · model` badge, `N inputs`, relative time (no «cost pending» badge any more) | wireframe A |
| cost pending | `costStatus = pending` (AC-02) | cost badge «cost pending» (outline) | wireframe A |
| cost unavailable | `costStatus = unavailable` (AC-02) | cost badge «cost unavailable» (outline, muted) | wireframe A |
| partial result | `imagesReceived < imagesRequested` (AC-01) | count badge «2 of 4 images» | wireframe A |
| image unavailable | preview fails (AC-10) | «Image unavailable» in the preview; strip still shown | wireframe B |
| loading more | next page in flight (AC-04) | under the grid: `Loader2` spinner + muted «Loading more…»; «Load more» button disabled | wireframe C |
| end | `nextCursor = null` (AC-04) | muted «That's everything» under the grid (only when > 1 page was loaded, or always after the first page) | wireframe C |
| next page failed | page request failed (AC-05) | cards kept · destructive-tinted line «Couldn't load more.» + `Button` outline «Try again»; no automatic retry | wireframe C |
| refresh failed | a refresh of loaded pages failed (AC-05) | cards kept · muted line above the grid «These cards may be out of date.» + `Button` link «Refresh» | wireframe C |
| loading (first) | no data yet | «Loading…» (unchanged) | — |
| error (first) | first page failed, no data | «Couldn't load the gallery» + Retry (unchanged) | — |
| empty | no generations | «No generations yet.» + «Write a prompt» (unchanged) | — |

```text
A — card                                 B — image unavailable
┌───────────────────────┐                ┌───────────────────────┐
│                       │                │   Image unavailable   │
│        preview        │                │                       │
│[$0.04][12.4 s][1024×1024][4 images]   │[cost pending][850 ms][1024×1536]
├───────────────────────┤                ├───────────────────────┤
│ A neon city at night… │                │ …                     │
│ [neon] [city] 💬      │
│ [openrouter · qwen…]  2 h ago │
└───────────────────────┘
C — under the grid
│ ⟳ Loading more…   [Load more](disabled)
│ That's everything
│ ⚠ Couldn't load more. [Try again]
│ (above the grid) These cards may be out of date. Refresh
```

The strip never wraps: it is `flex-nowrap overflow-hidden`; on narrow cards the last badges are cut by the card edge rather than covering more of the preview.

## New components

| Component | Why no existing primitive fits | Registered in design-system |
|---|---|---|
| CardBadges | feature component composing `Badge`s over a preview | n/a — feature-level |
