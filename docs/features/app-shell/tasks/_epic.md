# Epic — app-shell

> **Spec:** [spec.md](../spec.md) · **Design:** [sad.md](../sad.md) · **Screens:** [screens.md](../screens.md) · **ADRs:** [adr/](../adr/)

## Goal

An app frame with a left navigation bar and one page per section (Generate, Gallery), real addresses and a not-found page; the draft and a running generation survive section switches (spec §2).

## Scope

- **In:** router page parsing + section registry; app frame, NavBar, NotFound, document title; kept-mounted Generate with arrival-applied carried flags and the bar's job indicator; gallery/detail link targets; SPA fallback proof.
- **In (amendment 2026-10-19):** sidebar-08 frame, light/dark/system theme, recent generations.
- **Out:** Models and Folders sections, gallery grid, detail modal, phone layout (spec §3).

## Task map

```mermaid
flowchart LR
    T1["T1 domain"]
    T2["T2 ui"]
    T3["T3 ui"]
    T4["T4 ui"]
    T5["T5 ports"]
    T1 --> T2
    T2 --> T3
    T3 --> T4
    T1 --> T5
    T6["T6 infra"]
    T7["T7 ui"]
    T8["T8 ui"]
    T9["T9 ui"]
    T2 --> T6
    T6 --> T7
    T7 --> T8
    T7 --> T9
```

## Tasks

See [tracker.md](./tracker.md). Machine contract: [tasks.json](../tasks.json).

| # | Task | Layer | Blocked by |
|---|---|---|---|
| T1 | [Parse addresses into pages and declare sections in one registry](./t1-section-registry-and-router.md) | domain | — |
| T2 | [Render the app frame, the navigation bar and the not-found page (SCR-04, SCR-05)](./t2-app-frame-and-navbar.md) | ui | T1 |
| T3 | [Keep the draft across sections and show the running generation in the bar](./t3-keep-generate-and-job-indicator.md) | ui | T2 |
| T4 | [Point gallery and detail navigation at the sections](./t4-gallery-and-detail-targets.md) | ui | T3 |
| T5 | [Prove section addresses get the app page and the API stays guarded](./t5-spa-fallback-for-sections.md) | ports | T1 |
| T6 | [Vendor the sidebar-08 block and its primitives, trimmed and on the project conventions](./t6-vendor-sidebar-block.md) | infra | T2 |
| T7 | [Put the app frame on the sidebar block (SCR-04)](./t7-sidebar-frame.md) | ui | T6 |
| T8 | [Follow the system theme with a Light / Dark / System toggle (ADR-0024)](./t8-theme.md) | ui | T7 |
| T9 | [Show the ten latest generations next to the generate form (SCR-06, ADR-0025)](./t9-recent-generations.md) | ui | T7 |
