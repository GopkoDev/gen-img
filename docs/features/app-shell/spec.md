---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead"]
updated_at: "2026-10-19"
feature_size: "S"
---

# Spec — app-shell

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) step 8 (owner request, V1.1); [`docs/design-system.md`](../../design-system.md); shipped flows of steps 2–7 (`text-to-image-openrouter/ux-flows.md` SCR-01..03, ADR-0009 router, ADR-0019 draft source in the address).

## 1. Context

Today Ukiyo has one home page that holds both the generate panel and the gallery side by side, plus a detail page per generation. The roadmap adds new top-level areas next (a Models page in step 10, Folders in step 15) and grows the gallery into a paged grid (step 11), which needs the full width of the window. One crowded home page cannot take them without a redesign each time.

There is no external trigger; the Owner asked for it as the first V1.1 step so later steps plug into a stable frame.

Committed approach: a left navigation bar (an inset sidebar that can collapse to icons) lists Ukiyo's sections — today Generate and Gallery — and each section is its own page with its own address. The detail page of a generation belongs to the Gallery section. Moving between sections never loses what the Owner was doing: a half-written prompt is still there when they come back, and a generation in progress stays visible from every section. A new section is added by declaring it once; it then appears in the navigation bar and gets its own address. The app follows the system's light or dark appearance unless the Owner picks one in the sidebar. Next to the generate form, the Generate page shows the Owner's ten latest generations, so the last results are one click away without leaving Generate.

- **Assumptions ledger (interview depth: easy — answers delegated by the Owner):**
  - Sections that don't exist yet (Folders, Models) are **not** shown in the navigation bar, not even disabled — the bar lists only what works; each later step adds its own entry.
  - Generate is the start page (the app's root address), because generating is the most frequent action; the Gallery gets its own address.
  - The navigation bar is always visible on desktop widths; on narrow windows it becomes a compact bar at the top instead of a hidden menu (desktop-first posture, no phone layout goal).
  - Addresses that the earlier steps use for re-run, reuse and the «deleted» notice keep their meaning.
- **Amendment 2026-10-19 (owner decisions, before merge):** (1) the shell is the stock inset-sidebar block of the project's component kit — collapsible to an icon rail, a slide-in panel on narrow windows (replaces the compact top bar), no demo user/teams/projects; (2) theme follows the system with a light / dark / system toggle in the sidebar, remembered in the browser; (3) a recent strip with the 10 latest generations to the right of the generate card. Changed: §1 ¶3, §3, AC-09, AC-10, §6; added US-04, US-05, AC-11…AC-16. Edits-log: the amended AC were walked by the feature agent with the owner's decisions as answers; nothing moved to §8.

## 2. Goals

- The Owner reaches every section of Ukiyo in one click from anywhere in the app, and always sees which section they are in.
- Every section and every generation has an address that can be bookmarked, reloaded, opened in a new tab and walked with the browser's back and forward.
- Switching sections never loses the Owner's draft or hides a generation in progress.
- Adding the next section (Models, Folders) is a small, local change, not a redesign.

## 3. Non-goals

- The Models and Folders sections themselves (roadmap steps 10 and 15).
- Changing what the generate panel, the gallery or the detail page show — they move into sections as they are (the gallery grid is step 11, the detail modal step 12).
- A phone layout, a resizable navigation bar, keyboard shortcuts for individual sections (the kit's collapse shortcut stays).
- More than the ten latest generations next to the form, or paging there — the gallery is the place for that.
- Custom colour themes beyond light and dark.
- Remembering the draft across a page reload or a closed tab — only moving between sections inside the open app keeps it.

## 4. User stories

### US-01: Move between sections

**As an** Owner
**I want** a navigation bar that lists Ukiyo's sections and shows where I am
**So that** I reach generating and the gallery in one click, each on its own full page

### US-02: Use addresses like a normal website

**As an** Owner
**I want** each section and each generation to have its own address that works with reload, bookmarks, new tabs and back/forward
**So that** I can come back to exactly where I was

### US-03: Keep my work while I move around

**As an** Owner
**I want** my draft and a running generation to stay as they are when I switch sections, and the actions that start from a generation (re-run, use as input, write a prompt) to bring me to Generate
**So that** looking at the gallery never costs me the prompt I was writing or hides what is in progress

### US-04: Choose a theme

**As an** Owner
**I want** Ukiyo to follow my system's light or dark appearance, and to pick light or dark myself when I prefer
**So that** the app is comfortable to look at for long sessions and matches my desktop

### US-05: See my latest generations next to the form

**As an** Owner
**I want** my ten latest generations next to the generate form, each opening its detail page
**So that** I can compare and revisit recent results without leaving Generate

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** the Owner opens Ukiyo
**When** any page is shown
**Then** a navigation bar lists the sections Generate and Gallery in that order, marks the current one as current (visually and for assistive technology), and one click on an entry shows that section's page without reloading the app

### AC-02 (US-01, US-02) — happy path

**Given** the Owner is on the Gallery or opens a generation's detail page
**When** the page is shown
**Then** the Gallery section is marked as current on the detail page too, the detail page's «Gallery» link returns to the Gallery section, and the browser tab title names the current section (e.g. «Gallery · Ukiyo»)

### AC-03 (US-02) — happy path

**Given** the Owner is on any section or on a generation's detail page
**When** they reload the page, open its address in a new tab, or use the browser's back and forward buttons
**Then** the same section or generation is shown, and back/forward walk the pages in the order the Owner visited them

### AC-04 (US-02) — error

**Given** the Owner opens an address inside Ukiyo that is neither a section nor a generation
**When** the page is shown
**Then** Ukiyo says the page was not found, offers a way to Generate, and keeps the navigation bar — it does not silently show another section

### AC-05 (US-03) — domain invariant

**Given** the Owner has written a prompt, chosen settings or attached input images on Generate and has not generated yet
**When** they switch to the Gallery (or a generation's detail page) and come back to Generate through the navigation bar or the browser's back button
**Then** the prompt, the settings and the attached images are exactly as they left them

### AC-06 (US-03) — domain invariant

**Given** a generation is in progress
**When** the Owner is on any section other than Generate
**Then** the navigation bar shows that a generation is running on the Generate entry; when it finishes it is in the gallery without the Owner reloading, and a failure that is still waiting for the Owner's dismissal is flagged on the Generate entry until it is dismissed

### AC-07 (US-03) — cross-context

**Given** the Owner starts a re-run or «use as input» from a generation's detail page (step 6), or presses «Write a prompt» on the empty gallery
**When** the action is taken
**Then** Ukiyo switches to Generate with the navigation bar marking it current: the draft is filled from the source as in step 6, or the prompt field is focused; re-run and use-as-input still work when started again later in the same visit

### AC-08 (US-03) — cross-context

**Given** the Owner deletes a generation from its detail page (step 5)
**When** the deletion succeeds
**Then** Ukiyo lands on the Gallery section with the short «Generation deleted.» notice, as before

### AC-09 (US-02, US-05) — authorization

**Given** Ukiyo is running
**When** a page of another site in the Owner's browser asks Ukiyo for a section's address or for the latest generations
**Then** the new addresses add no way in: Ukiyo's data stays refused to other sites exactly as before (the app's pages carry no data of their own)

### AC-10 (US-01) — happy path

**Given** a window narrower than a tablet
**When** any page is shown
**Then** a menu button at the top of the page opens the sections as a slide-in panel, choosing one closes the panel and shows that section, and no page needs horizontal scrolling because of the navigation

### AC-11 (US-04) — happy path

**Given** the Owner has never chosen a theme
**When** Ukiyo is shown
**Then** it uses the system's light or dark appearance and follows it when the system changes; a theme control in the sidebar offers Light, Dark and System, the chosen one applies at once to every page and is remembered after a reload, without a flash of the other theme while loading

### AC-12 (US-04) — error

**Given** the browser refuses to remember the Owner's choice (storage blocked or broken)
**When** Ukiyo loads or the Owner picks a theme
**Then** Ukiyo still works: it shows the system appearance on load, the pick applies for the open page, and nothing fails or shows an error

### AC-13 (US-05) — happy path

**Given** the Owner has saved generations
**When** the Generate page is shown
**Then** to the right of the generate form a panel lists the ten latest generations, newest first, one thumbnail each (its first output image), and a click on a thumbnail opens that generation's detail page; with fewer than ten it shows all of them, and there is no «load more»

### AC-14 (US-05) — cross-context

**Given** the recent panel is shown
**When** a generation finishes, or a generation is deleted
**Then** the panel shows the new ten latest without a reload — the new generation first, the deleted one gone — and never more than ten

### AC-15 (US-05) — error

**Given** the latest generations can't be loaded, are loading, or don't exist yet
**When** the Generate page is shown
**Then** the panel says so in the app's usual way — a «Loading…» line, «Couldn't load recent generations» with Retry, or «No generations yet.» — and the generate form keeps working

### AC-16 (US-01) — happy path

**Given** a desktop-wide window
**When** the Owner collapses the sidebar (its button or the keyboard shortcut)
**Then** it shrinks to an icon rail where each section still opens in one click and names itself on hover, and the current section stays marked; expanding brings the labels back

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Section switch | the new section's page is shown ≤ 100 ms after the click on a warm app (no full page load) | component test asserts no document reload + manual check at ship |
| Draft survival | 100 % of draft fields (prompt, model, parameters, attachments) intact after Generate → Gallery → Generate | component test |
| Adding a section | one declaration in one place adds the entry, its address and its page; no edit to the navigation bar itself | unit test over the section list + review |
| Server load | switching sections makes no new request for a page already visited, and the running-generation indicator adds no requests of its own (one poller only) | component test counts job requests |
| Recent panel | one request for at most 10 generations per change (finish, delete, curation); no polling of its own | component test counts list requests |
| Theme | the stored theme applies before the first paint (no flash); switching re-renders no data | inline-script unit test + manual check at ship |

## 6.1 Security / privacy

- **Data classification:** none new — navigation only.
- **Personal data touched:** none.
- **AuthZ/AuthN impact:** none; section addresses serve the same app page as today, the data stays behind the existing request guard (ADR-0007).
- **Abuse cases:** a foreign page probing section addresses learns nothing it couldn't from the root page (AC-09).
- **Security review:** N/A — no new data path, no new secret use.

## 7. Metrics / KPIs

- **Clicks from any page to Generate or Gallery** — baseline: 1–2 (via the «Gallery» link or the logo), target: 1 from every page.
- **Lost drafts when visiting the gallery** — baseline: the gallery sits next to the panel, so 0, target: still 0 after the split (owner check over 2 weeks).
- **Files touched to add the Models section (step 10)** — target: the section list + the new page only.

## 8. Open questions

<!-- none — all decisions resolved during specify (see §1 assumptions ledger and the AC). -->

## Test plan

<!-- quick route: inline per the size matrix (XS/S). -->

| AC | Test(s) | Level | Task |
|---|---|---|---|
| AC-01 | nav lists Generate, Gallery in order; current entry has `aria-current`; click switches page, no reload | unit (section match) + component | T1, T2, T7 |
| AC-02 | detail marks Gallery current; «Gallery» link → Gallery; document title per page | component | T2, T4 |
| AC-03 | each address renders its page on a fresh render; back/forward via popstate; server serves the app page for every section address | unit + component + integration | T1, T2, T5 |
| AC-04 | unknown address → «Page not found.» + link to Generate, nav kept; breadcrumb «Page not found» | unit + component | T1, T2, T7 |
| AC-05 | prompt, settings and attachments survive Generate → Gallery → Generate | component | T3 |
| AC-06 | running job → indicator on Generate entry while on Gallery; finish → gallery refetched; failed notice → flag until dismissed; no extra job polling | component | T3, T7 |
| AC-07 | re-run / reuse from detail fill the draft on Generate, twice in one visit; «Write a prompt» focuses the prompt | component | T3, T4 |
| AC-08 | delete → Gallery section with «Generation deleted.» | component | T4 |
| AC-09 | section addresses serve the app page; guarded API unchanged; the recent list (limit 10) refused cross-site | integration | T5, T9 |
| AC-10 | below `md` the header trigger opens the sidebar sheet; choosing an entry closes it and navigates; manual check at ship | component + manual | T7 |
| AC-11 | default system follows `prefers-color-scheme` (and its change); Light / Dark / System set class + storage; inline script applies the stored theme before the bundle | unit (script in jsdom) + component | T8 |
| AC-12 | storage throwing on read and write → system on load, pick applies, no error | unit + component | T8 |
| AC-13 | ten latest asked with limit 10, newest first, thumbnails link to detail; fewer shown as is; no «load more» | component + integration | T9 |
| AC-14 | job success and deletion refresh the panel once; never more than ten | component | T9 |
| AC-15 | loading / «No generations yet.» / error + Retry; form keeps working | component | T9 |
| AC-16 | trigger collapses to the icon rail (state attribute), entries stay links, current kept, tooltips | component | T7 |

- **NFR:** draft survival and one-poller-only in component tests; «one declaration adds a section» as a unit test rendering a registry with an extra entry; section switch timing checked manually at ship (jsdom has no paint timing).
- **Theme / layout:** both themes and the narrow sheet are additionally checked by hand at ship (jsdom has no layout or paint).
- **Test data:** existing `summary()` / `renderWithQuery` helpers; stubbed `fetch` per endpoint; no provider calls.
