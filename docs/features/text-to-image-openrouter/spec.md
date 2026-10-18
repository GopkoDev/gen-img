---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Spec — text-to-image-openrouter

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/idea-brief.md`](../../idea-brief.md) (§2, §5, §6, §7), [`docs/roadmap.md`](../../roadmap.md) step 2, [`docs/architecture-map.md`](../../architecture-map.md) — no extra channels.

## 1. Context

The owner generates images in provider playgrounds today and loses them: prompts and results disappear, so making «something like last week's image» means starting from scratch, and switching to another model with the same request means retyping it (idea-brief §2, owner-reported). This feature is the first vertical slice of gen-img for the single owner: generate an image from a text prompt through one provider and keep every result, with enough metadata to repeat it, in a local gallery.

There is no external deadline; the trigger is the recurring playground pain plus the decision to build gen-img step by step (idea-brief §4). The project skeleton is in place (roadmap step 1), and this slice is what every later step builds on: image inputs (step 3) and the second provider (step 4) both extend the generation record, the provider boundary and the gallery introduced here (roadmap dependency graph).

Committed approach: a text-to-image flow through OpenRouter only, end to end — the owner picks an image model, writes a prompt and optional parameters, and every successful generation is saved on the owner's machine (output images + full metadata incl. the raw exchange, cost with its status, duration) and browsable in a newest-first gallery with a detail view. The provider is reached only through a provider-neutral boundary, so step 4 adds the second provider without touching the generation flow. This follows the owner-accepted direction in idea-brief §7 («both providers in v1» is delivered across steps 2 + 4, per the roadmap); the sharpest failure vectors from the devil's-advocate pass (secret leak, paid-but-lost, double spend, partial results, silently ignored parameters, cost shown as zero) shaped AC-06…AC-12, AC-16, AC-17 and §6.1.

- Traceability: roadmap D2 (design canon) is closed by [`docs/design-system.md`](../../design-system.md) (code-mode, desktop-first), written before this spec's design stage.
- Decision override: AC-08 keeps the all-or-nothing invariant even though a storage failure after a paid response loses that result — rationale: such failures (disk full, permission) are rare on a local machine, and a half-saved generation is worse; Goal 1 and the «Lost generations» KPI exclude it explicitly and the Owner is told on the spot.
- Traceability: provider capability facts (image endpoint, cost in the response, `seed` «where supported», model catalog) are source-verified in idea-brief §6 as of 2026-10-18; whether the response carries a generation id usable for a later stats lookup is open (roadmap D1 → §8).

## 2. Goals

- Every image the owner generates through gen-img is kept on their machine with enough metadata to repeat the request — nothing is lost after a successful generation, except when the machine itself cannot store it, and then the Owner is told on the spot (AC-08).
- The owner finds and inspects any past generation (prompt, model, parameters, cost, timing) from the gallery instead of a provider playground.
- The generation flow is provider-neutral, so the second provider (roadmap step 4) is an addition, not a rewrite.

## 3. Non-goals

- Input images (img→img, img+text→img) — roadmap step 3; this slice is text-only to land the record and gallery first.
- Vercel AI Gateway — roadmap step 4; one provider proves the provider boundary before the second one.
- Commenting, tagging, deleting, re-running or reusing a generation — roadmap steps 5–6; this slice is generate + store + browse.
- Keeping failed generations in the gallery — a failed request produced no image and (normally) no charge; the owner sees the reason on the spot instead.
- Gallery search and filters — out of v1 by owner decision (idea-brief §5).

## 4. User stories

### US-01: Generate an image from text

**As an** Owner
**I want** to pick an OpenRouter image model, write a prompt, optionally set aspect ratio, seed and number of images, and generate
**So that** I get images without leaving gen-img

### US-02: Keep every generation automatically

**As an** Owner
**I want** each successful generation saved on my machine with its output images and full metadata
**So that** no prompt or result is lost and I can repeat the request later

### US-03: Browse the gallery

**As an** Owner
**I want** to see all my generations newest first as thumbnails
**So that** I can find a past result quickly

### US-04: Inspect a generation

**As an** Owner
**I want** to open a generation and see its images, prompt, model, parameters, cost with its status, created-at, duration and the raw provider exchange
**So that** I know exactly what produced the image and what it cost

### US-05: Understand why a generation failed

**As an** Owner
**I want** a plain explanation when a generation can't be made, with my prompt and settings kept in the form
**So that** I can fix the cause and retry without retyping

### US-06: Keep my provider key private

**As an** Owner
**I want** my provider key to stay on my machine's server side and the app to be unreachable from other devices
**So that** nobody can spend my provider balance through gen-img

## 5. Acceptance criteria

### AC-01 (US-01, US-02) — happy path

**Given** the Owner has configured an OpenRouter key and opened the generate form
**When** the Owner selects an image model, enters a non-empty prompt and generates
**Then** the system shows a «generating» state, then the resulting output images, and the new generation appears at the top of the gallery

### AC-02 (US-02, US-04) — happy path

**Given** a generation has just succeeded
**When** the Owner opens its detail view
**Then** the Owner sees the output images, provider, image model, prompt, the parameters the Owner set, created-at, duration, the cost with its cost status, and the raw request and response the provider exchanged

### AC-03 (US-01) — happy path

**Given** the Owner opens the generate form
**When** the Owner opens the model picker
**Then** the system lists the image models OpenRouter currently offers (by name and model id), so the Owner never has to type a model id from memory

### AC-04 (US-03) — happy path

**Given** the Owner has many saved generations
**When** the Owner opens the gallery
**Then** the system shows thumbnails newest first with prompt excerpt, model and created-at, and loads older generations on demand rather than all at once

### AC-05 (US-01) — error

**Given** the Owner is on the generate form
**When** the Owner tries to generate with an empty or whitespace-only prompt, no model selected, or a number of images outside 1–4
**Then** the system does not send anything to the provider and tells the Owner which field must be fixed and how

### AC-06 (US-05) — error

**Given** the Owner submits a valid request
**When** the provider refuses or fails it (e.g. insufficient credits, content moderation, model unavailable, timeout), or answers without a single usable image
**Then** the system shows the Owner the provider's reason in plain language, keeps the prompt and settings in the form, and saves nothing to the gallery

### AC-07 (US-04) — domain invariant

**Given** the provider's answer for a successful generation does not state a price
**When** the generation is saved and the Owner opens it
**Then** the cost is shown as «unavailable», never as zero — an unknown price is never presented as free

### AC-08 (US-02) — domain invariant

**Given** the Owner generates successfully but saving the output images on the machine fails part-way (e.g. the disk is full)
**When** the save is attempted
**Then** the system keeps the invariant «a generation is saved only together with all its output images»: no partial generation appears in the gallery, and the Owner is told the result could not be stored and why

### AC-09 (US-01, US-04) — domain invariant

**Given** the Owner set a seed, an aspect ratio or a number of images
**When** the generation is saved
**Then** the detail view shows the parameters exactly as they were sent, labelled «requested», next to what actually came back (number of images received, each image's real dimensions) and the parameters the provider reports it accepted, or «not reported» where it reports none — the system never claims a requested parameter was applied or that the result is pixel-reproducible

### AC-10 (US-06) — authorization

**Given** the Owner has saved generations and a configured key
**When** anyone inspects what the app shows in the browser — the generate form, the gallery, a detail view including the raw request
**Then** the provider key appears nowhere; the stored raw request has the key removed

### AC-11 (US-06) — authorization

**Given** gen-img is running on the Owner's machine
**When** another device on the same network tries to open the app or ask it to generate
**Then** it cannot reach the app at all, so nobody but the Owner can spend the provider balance or see the gallery

### AC-12 (US-04) — authorization

**Given** the Owner (or a crafted link) asks the app for an image file
**When** the requested file is not an image stored under the app's own data folder
**Then** the system does not reveal it or whether it exists — only stored generation images are ever served

### AC-13 (US-01) — cross-context

**Given** no OpenRouter key is configured on the server
**When** the Owner opens the generate form
**Then** the system tells the Owner that OpenRouter is not configured and how to configure it, and generation is not offered; the gallery of earlier generations stays browsable

### AC-14 (US-01) — cross-context

**Given** the provider's model list cannot be loaded (provider down, network off)
**When** the Owner opens the model picker
**Then** the system says the model list is unavailable and lets the Owner retry, while the gallery stays browsable

### AC-15 (US-03) — happy path

**Given** the Owner has no saved generations yet
**When** the Owner opens the gallery
**Then** the system shows an empty state that points to the generate form

### AC-16 (US-02) — domain invariant

**Given** the Owner asked for several images
**When** the provider returns fewer usable images than requested (but at least one)
**Then** the system saves the generation with the images it received and the detail view states how many were requested and how many were received — a paid partial result is never thrown away

### AC-17 (US-01, US-02) — happy path

**Given** a generation is in progress
**When** the Owner closes or reloads the page before it finishes
**Then** the generation still completes and appears in the gallery; while it is in progress the generate form cannot be submitted again, so one click never spends twice

### AC-18 (US-04) — cross-context

**Given** a generation was made through a provider
**When** the Owner looks at it in the gallery or the detail view
**Then** the provider that produced it is always shown next to the image model, so generations from a second provider added later sit in the same gallery without ambiguity

### AC-19 (US-06) — authorization

**Given** a page from another site is open in the Owner's browser while gen-img runs
**When** that page tries to start a generation or read the gallery through gen-img
**Then** nothing is sent to the provider, no balance is spent and no gallery data is handed to that page

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Gallery first page (24 items) with 1 000 saved generations | ≤ 300 ms p95 server time | integration test over a seeded data dir |
| Detail view load | ≤ 150 ms p95 server time | integration test over a seeded data dir |
| Local overhead on a generation (excluding provider time) | ≤ 500 ms p95 for up to 4 output images of ≤ 5 MB each | integration test with a stubbed provider |
| Provider request timeout | 180 s, then the AC-06 failure path | integration test with a hanging stub |
| Durability | 0 successful generations lost or half-saved after a crash/kill mid-save | AC-08 test + restart test on a temp data dir |
| Cost precision | a known cost is kept exactly to 1 micro-USD (fractions of a cent never rounded to 0) | unit test over fractional-cent fixtures |
| Raw response size in metadata | 0 bytes of embedded image payload in the stored raw response (images replaced by references to the stored files) | integration test asserts stored raw response has no base64 image payload |

## 6.1 Security / privacy

- **Data classification:** confidential — prompts and images are the owner's private work, and the provider key carries spending power.
- **Personal data touched:** none beyond the owner's own prompts and images; no third-party personal data is collected.
- **AuthZ/AuthN impact:** no accounts by design (single owner); the boundary is «same machine only» — the app is reachable only from the owner's machine; the provider key stays server-side and is stripped from stored raw requests; file serving is limited to stored generation images.
- **Abuse cases:**
  - Another device on the LAN tries to generate (spend the balance): unreachable — the app is not exposed beyond the machine.
  - A malicious web page in the owner's browser tries to trigger generations against the local app: the app only accepts generate requests that come from its own UI origin; others are refused without effect.
  - Path tricks in an image link to read arbitrary files: only stored generation images are served; anything else is reported as not found.
  - Key leak through stored metadata or logs: the key is removed from the stored raw request and never logged.
  - Accidental double-submit spending twice: while a generation is in progress the form cannot be submitted again.
- **Security review:** Required — new outbound spending path with a secret key and a new file-serving surface.

## 7. Metrics / KPIs

- **Successful generations saved with complete metadata** — baseline: 0 (no app), target: 100% of successful generations within the first 2 weeks of use (checked by a metadata-completeness query over the data dir).
- **Lost generations** — baseline: every playground generation is unrecorded today, target: 0 successful provider responses without either a saved generation or an on-the-spot storage-failure notice (AC-08) over the first 2 weeks.
- **Owner's image generations made through gen-img instead of a playground** — baseline: 0%, target: ≥ 80% within 2 weeks of shipping (owner self-report).

## 8. Open questions

- [ ] Does OpenRouter's image response carry a generation id usable for a later stats lookup (upstream latency, cost cross-check)? Default now: store whatever id the response carries in the raw response; no follow-up lookup in this slice. — owner: dmytro.hopko, due: first real call during implement (roadmap D1)
- [ ] Which parameters does each image model actually accept (seed, aspect ratio, number of images)? Default now: send what the Owner set, record exactly what was sent, and surface a provider refusal via AC-06. — owner: dmytro.hopko, due: before sdd:api
