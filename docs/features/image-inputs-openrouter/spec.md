---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-18"
feature_size: "S"
---

# Spec — image-inputs-openrouter

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/idea-brief.md`](../../idea-brief.md) §2, §7; [`docs/roadmap.md`](../../roadmap.md) step 3; the shipped [`text-to-image-openrouter`](../text-to-image-openrouter/spec.md) spec + SAD (reference module); the public OpenRouter image-model catalog (2026-10-18, unauthenticated).

## 1. Context

To change an existing picture today the Owner downloads it, re-uploads it into a provider playground, attaches it to a prompt and describes the change — and the attached picture is then lost together with the playground history (idea-brief §2, owner-reported). gen-img already keeps text-to-image generations locally (roadmap step 2, shipped); this slice lets the Owner attach input images to a generation (img→img and img+text→img) through OpenRouter and keeps copies of those inputs with the generation, so the detail view shows exactly which pictures went in.

Why now: it is the next step of the roadmap's dependency graph — step 6 («use an output as the next input», «re-run with the same inputs») resends stored input images, so it cannot start before inputs are stored (roadmap wave 3).

Committed approach: extend the existing generation flow — the generate form gains an «input images» area that is offered only for models whose catalog entry lists image inputs, limited to that model's minimum and maximum number of input images; each attached file is checked locally (supported picture format, size limit) before anything is sent; copies of the inputs are saved together with the generation under the same all-or-nothing rule as outputs (CONTEXT invariant), and the stored raw request references those copies instead of embedding image data. No new provider and no change to the provider-neutral boundary beyond carrying input images (roadmap step 4 reuses it). The devil's-advocate vectors (oversized files, phone formats like HEIC, a model switch after attaching, edit-only models that require an input, raw-request bloat, location data inside photos) shaped AC-03…AC-08 and §6.1.

- Traceability: the catalog lists `input_references` per model as a range (e.g. 0–4, 0–16; some edit models 1–10, i.e. at least one input required); the Image API takes inputs as image references (URL or data URL) — source-verified in the step-2 fact-check (2026-10-18). Whether a prompt may be empty when images are attached is not documented → §8.

## 2. Goals

- The Owner can change an existing picture or combine pictures without leaving gen-img and without re-uploading anything into a playground.
- Every generation made from input images keeps those inputs, so the Owner can always see (and later reuse — roadmap step 6) what went in.
- A request that a model cannot accept is caught before it is sent, so the Owner doesn't pay for or wait on an avoidable refusal.

## 3. Non-goals

- Using a gallery output as the next input in one click, and re-running with stored inputs — roadmap step 6; this slice only attaches files from the Owner's machine.
- Editing inputs inside gen-img (crop, mask, resize) — the provider does the transformation; a local editor is a separate product.
- Image inputs through Vercel AI Gateway — roadmap step 4 adds that provider.
- Formats other than PNG, JPEG, WebP and GIF (e.g. HEIC, SVG) — the Owner converts them first; supporting more formats needs a local converter.

## 4. User stories

### US-01: Generate from input images and a prompt

**As an** Owner
**I want** to attach one or more input images to my prompt and generate
**So that** I can change or combine existing pictures without a playground

### US-02: Know what a model accepts before sending

**As an** Owner
**I want** the form to show whether the chosen model takes input images and how many
**So that** I don't send a request the model will refuse

### US-03: See the inputs of a generation later

**As an** Owner
**I want** the detail view (and a hint in the gallery) to show the input images a generation was made from, in order
**So that** I know exactly what produced the result and can reuse it later

### US-04: Keep my attachments safe and contained

**As an** Owner
**I want** my input images to be sent only to the provider I chose and stored only as part of the generation
**So that** my private pictures don't leak and don't pile up as stray files

## 5. Acceptance criteria

### AC-01 (US-01, US-03) — happy path

**Given** the Owner has chosen a model that accepts input images and attached two supported images
**When** the Owner writes a prompt and generates
**Then** the generation is saved with copies of both input images, and its detail view shows the inputs in the order they were attached next to the outputs

### AC-02 (US-02) — happy path

**Given** the Owner opens the generate form
**When** the Owner chooses a model
**Then** the form offers an input-images area only if the model accepts input images, states how many it accepts (e.g. «up to 4», «1 to 10»), and hides it for text-only models

### AC-03 (US-01) — error

**Given** the Owner attaches files
**When** a file is not a PNG, JPEG, WebP or GIF picture (e.g. HEIC, PDF, a broken file) or is larger than 10 MB
**Then** the system refuses that file with the reason («not a supported image», «larger than 10 MB»), keeps the other attachments, and nothing is sent

### AC-04 (US-02) — error

**Given** the chosen model accepts at most N input images
**When** the Owner attaches more than N and tries to generate
**Then** the system blocks the request and tells the Owner the model takes at most N input images

### AC-05 (US-02) — domain invariant

**Given** the chosen model requires at least one input image (an edit-only model)
**When** the Owner tries to generate without attaching any
**Then** the system blocks the request and tells the Owner this model needs at least one input image

### AC-06 (US-01, US-04) — domain invariant

**Given** a generation with input images succeeds at the provider but storing its files fails part-way
**When** the save is attempted
**Then** the invariant «a generation is saved only together with all its output images and copies of all its input images» holds: neither the generation nor any input copy remains, and the Owner is told why

### AC-07 (US-04) — authorization

**Given** generations with input images are stored
**When** anyone asks gen-img for an input-image file that is not recorded as an input of a stored generation, or a foreign page asks for a recorded one
**Then** the system reveals nothing — only gen-img's own pages get stored input images, and the stored raw request contains references to the stored copies, never the image data itself

### AC-08 (US-02) — cross-context

**Given** the Owner has attached images and then switches to another model
**When** the new model accepts fewer input images or none at all
**Then** the form keeps the attachments, marks the ones the new model can't take, and blocks generating until the Owner removes them or switches back

### AC-09 (US-01) — error

**Given** the Owner generates with input images
**When** the provider refuses (e.g. moderation of an input image, insufficient credits) or fails
**Then** the Owner sees the provider's reason, the prompt and the attached images stay in the form, and nothing is saved

### AC-10 (US-03) — happy path

**Given** some generations were made with input images
**When** the Owner browses the gallery
**Then** those tiles show how many input images went in, and text-only generations show no such hint

### AC-11 (US-01) — cross-context

**Given** the Owner generates without attaching any image on a model that doesn't require one
**When** the generation runs
**Then** it behaves exactly as a text-to-image generation from step 2 — nothing about inputs is sent or stored

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Input image size | ≤ 10 MB per image; count limited by the model's catalog range | unit + web tests |
| Local overhead with inputs (excluding provider time) | ≤ 1 000 ms p95 for 4 input images of 10 MB + 4 output images of 5 MB | integration test with a stubbed provider |
| Detail view with inputs | ≤ 150 ms p95 server time | integration test over a seeded data dir |
| Raw request size in metadata | 0 bytes of embedded input image data in the stored raw request | integration test asserts no data-URL payload remains |
| Durability | 0 input copies without a generation and 0 generations missing an input copy after a failed save or a restart | integration test (stage fails mid-way) + boot sweep test |

## 6.1 Security / privacy

- **Data classification:** confidential — input images are the Owner's private pictures (may include people or location metadata).
- **Personal data touched:** the Owner's own pictures; photos may carry location metadata inside the file. gen-img stores the copy byte-for-byte and sends it only to the chosen provider; stripping metadata is out of scope (noted in §8).
- **AuthZ/AuthN impact:** unchanged boundary — same machine only, request guard on every read; input copies are served only when recorded as an input of a stored generation.
- **Abuse cases:**
  - A foreign page tries to read input images: refused like any other gen-img request (step-2 AC-19).
  - Path tricks to read arbitrary files through input links: only recorded input copies are served; anything else is «not found».
  - A huge or malformed upload exhausts memory/disk: files over 10 MB and non-images are refused before anything is stored or sent.
  - Input image data leaks into stored metadata: the stored raw request holds references to the copies, not the data.
- **Security review:** Required — new upload path for user files and a new file-serving category.

## 7. Metrics / KPIs

- **Image-input generations that keep all their inputs** — baseline: 0 (not possible today), target: 100% within 2 weeks of shipping (checked by comparing stored inputs vs requested inputs).
- **Requests refused by the provider for input-count or input-support reasons** — baseline: unknown (playground), target: 0 in the first 2 weeks (the form blocks them first; measured from failure notices).
- **Owner's edits of existing pictures done in gen-img instead of a playground** — baseline: 0%, target: ≥ 80% within 2 weeks (owner self-report).

## 8. Open questions

- [ ] May the prompt be empty when input images are attached (pure img→img)? Default now: the prompt stays required — the provider's documentation lists it as required; img→img means images + a short instruction. — owner: dmytro.hopko, due: first real call with a key (outside this pipeline run)
- [ ] Should gen-img strip location metadata from photos before sending/storing them? Default now: no — inputs are sent and stored byte-for-byte; the Owner decides what to attach. — owner: dmytro.hopko, due: before roadmap step 6
