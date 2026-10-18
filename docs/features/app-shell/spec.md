---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead"]
updated_at: "2026-10-18"
feature_size: "S"
---

# Spec — app-shell

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/roadmap.md`](../../roadmap.md) step 8 (owner request, V1.1); [`docs/design-system.md`](../../design-system.md); shipped flows of steps 2–7 (`text-to-image-openrouter/ux-flows.md` SCR-01..03, ADR-0009 router, ADR-0019 draft source in the address).

## 1. Context

Today Ukiyo has one home page that holds both the generate panel and the gallery side by side, plus a detail page per generation. The roadmap adds new top-level areas next (a Models page in step 10, Folders in step 15) and grows the gallery into a paged grid (step 11), which needs the full width of the window. One crowded home page cannot take them without a redesign each time.

There is no external trigger; the Owner asked for it as the first V1.1 step so later steps plug into a stable frame.

Committed approach: a left navigation bar lists Ukiyo's sections — today Generate and Gallery — and each section is its own page with its own address. The detail page of a generation belongs to the Gallery section. Moving between sections never loses what the Owner was doing: a half-written prompt is still there when they come back, and a generation in progress stays visible from every section. A new section is added by declaring it once; it then appears in the navigation bar and gets its own address.

- **Assumptions ledger (interview depth: easy — answers delegated by the Owner):**
  - Sections that don't exist yet (Folders, Models) are **not** shown in the navigation bar, not even disabled — the bar lists only what works; each later step adds its own entry.
  - Generate is the start page (the app's root address), because generating is the most frequent action; the Gallery gets its own address.
  - The navigation bar is always visible on desktop widths; on narrow windows it becomes a compact bar at the top instead of a hidden menu (desktop-first posture, no phone layout goal).
  - Addresses that the earlier steps use for re-run, reuse and the «deleted» notice keep their meaning.

## 2. Goals

- The Owner reaches every section of Ukiyo in one click from anywhere in the app, and always sees which section they are in.
- Every section and every generation has an address that can be bookmarked, reloaded, opened in a new tab and walked with the browser's back and forward.
- Switching sections never loses the Owner's draft or hides a generation in progress.
- Adding the next section (Models, Folders) is a small, local change, not a redesign.

## 3. Non-goals

- The Models and Folders sections themselves (roadmap steps 10 and 15).
- Changing what the generate panel, the gallery or the detail page show — they move into sections as they are (the gallery grid is step 11, the detail modal step 12).
- A phone layout, a collapsible or resizable navigation bar, keyboard shortcuts for sections.
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

### AC-09 (US-02) — authorization

**Given** Ukiyo is running
**When** a page of another site in the Owner's browser asks Ukiyo for a section's address
**Then** the new addresses add no way in: Ukiyo's data stays refused to other sites exactly as before (the app's pages carry no data of their own)

### AC-10 (US-01) — happy path

**Given** a window narrower than a tablet
**When** any page is shown
**Then** the sections stay reachable in one click from a compact bar at the top of the page, and no page needs horizontal scrolling because of the navigation

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Section switch | the new section's page is shown ≤ 100 ms after the click on a warm app (no full page load) | component test asserts no document reload + manual check at ship |
| Draft survival | 100 % of draft fields (prompt, model, parameters, attachments) intact after Generate → Gallery → Generate | component test |
| Adding a section | one declaration in one place adds the entry, its address and its page; no edit to the navigation bar itself | unit test over the section list + review |
| Server load | switching sections makes no request that the shown page would not make anyway; no extra polling for the running-generation indicator | component test counts job requests |

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

