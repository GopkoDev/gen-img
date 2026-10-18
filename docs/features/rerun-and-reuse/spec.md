---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Spec — rerun-and-reuse

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/idea-brief.md`](../../idea-brief.md) §2, §5, §7; [`docs/roadmap.md`](../../roadmap.md) step 6; shipped features [`text-to-image-openrouter`](../text-to-image-openrouter/spec.md), [`image-inputs-openrouter`](../image-inputs-openrouter/spec.md), [`vercel-ai-gateway`](../vercel-ai-gateway/spec.md), [`curate-gallery`](../curate-gallery/spec.md) (open question §8 on lineage after deletion).

## 1. Context

The Owner keeps every generation in the gallery, but making «the same again», «the same with another model», or «take this result and change it» still means retyping the prompt, re-selecting parameters and downloading an output only to upload it again (idea-brief §2: «щоб змінити наявну картинку, її треба вручну завантажити, знову приєднати до промпта і описати зміну»; «незручно перейти на іншу модель з тим самим запитом»). This feature closes that loop for the single Owner.

Steps 2–5 are shipped: both providers, input images, and curation (comment, tags, deletion). Re-run and reuse were part of the owner-accepted MVP actions from the start (idea-brief §7: «повторити/змінити модель», «використати як вхід … з посиланням на батьківську генерацію»); curate-gallery deliberately left the lineage-after-deletion question to this step (its spec §8).

Committed approach: from a generation's detail view the Owner can **re-run** it — the generate form opens pre-filled with the same provider, model, prompt, parameters and input images, which the Owner may change (including switching model or provider) before generating — or **use any output image as an input** of the next generation in one action. gen-img takes the images it already stores instead of asking the Owner to upload them again, the new generation keeps its own copies (step 3's invariant), and records its **lineage** to the source generation, shown on both sides. Deleting a source never blocks or touches derived generations; their lineage then shows the source as deleted. «Reproduce» stays «resend the same inputs», never a promise of the same picture (idea-brief §5/§7).

- Decision (resolves curate-gallery spec §8, 2026-10-18): when a source generation is deleted, its derived generations are kept unchanged and their lineage shows «source deleted»; deletion is never blocked by derived generations (owner default, delegated).
- Traceability: ideation for this step reuses the accepted idea-brief direction (§7); no competitor research — internal tool. The failure-mode pass (run in-thread: no clean-context subagent was available in this run) shaped AC-05, AC-08…AC-11, AC-13.

## 2. Goals

- The Owner repeats or varies any past generation without retyping, re-selecting or re-uploading anything.
- Moving to another model or provider with the same request never silently sends something the new model cannot take.
- Every generation made from another one shows where it came from, and its origin shows what was made from it — without ever tying their lifetimes together.

## 3. Non-goals

- Pixel-identical reproduction — providers don't guarantee it (idea-brief §5); re-run means «same inputs again».
- Batch re-runs (several models at once, «re-run all») — one generation per run keeps the single-slot model and spending visible.
- A lineage tree or graph view — one level each way (source, derived list) answers «where did this come from»; deeper navigation is clicking through.
- Combining images from several generations in one action — reuse carries one output per action; the Owner can still attach more files by hand.
- Editing a source generation — generations stay immutable apart from comment and tags.

## 4. User stories

### US-01: Re-run a generation

**As an** Owner
**I want** to open a past generation and start it again with everything pre-filled
**So that** I repeat a request without retyping or re-uploading

### US-02: Re-run with another model or provider

**As an** Owner
**I want** to switch the pre-filled request to another model or provider before generating
**So that** I compare models on the same request safely

### US-03: Use an output as the next input

**As an** Owner
**I want** to turn one output image of a generation into the input of a new one in one action
**So that** I can refine a result without downloading and uploading it

### US-04: See a generation's lineage

**As an** Owner
**I want** to see which generation a result came from and which generations were made from it
**So that** I can follow how an image evolved

### US-05: Delete freely despite lineage

**As an** Owner
**I want** deleting a generation to never be blocked or to change what was made from it
**So that** curating the gallery stays simple and derived results are safe

## 5. Acceptance criteria

### AC-01 (US-01) — happy path

**Given** a saved generation whose provider is configured and whose model is still offered
**When** the Owner chooses «Re-run» on its detail view
**Then** the generate form opens with the same provider, model, prompt, parameters and input images (in the same order) already filled in, says it is a re-run of that generation, and the Owner can generate without changing anything

### AC-02 (US-01, US-04) — happy path

**Given** the Owner generated from a re-run form
**When** the new generation is saved and the Owner opens it
**Then** its detail view says «Re-run of» with a link to the source generation, it holds its own copies of the input images, and the source's detail view lists it among the generations made from it

### AC-03 (US-03, US-04) — happy path

**Given** a saved generation with one or more output images
**When** the Owner chooses «Use as input» on one of its output images
**Then** the generate form opens with exactly that image attached as the input image, an empty prompt, and the currently chosen model kept if it accepts input images (otherwise the first model of the current provider that does); once generated, the new generation's detail view says «Made from output N of» with a link to the source

### AC-04 (US-04) — happy path

**Given** a generation from which other generations were re-run or reused
**When** the Owner opens its detail view
**Then** the system lists those derived generations (newest first, how each was derived, link to each); a generation with no source and no derived generations shows no lineage section

### AC-05 (US-02) — domain invariant

**Given** a re-run form pre-filled from a generation
**When** the Owner switches to a model or provider that does not support some of the pre-filled parameters (seed, aspect ratio, number of images) or input images
**Then** the system removes the unsupported parameters from the form and names each one to the Owner («not supported by this model: seed»), marks input images the new model cannot take, and never sends a parameter or image the chosen model does not support

### AC-06 (US-01) — domain invariant

**Given** the Owner re-runs a generation
**When** the form or the result is shown
**Then** the system describes it as sending the same inputs again and never claims the result will be the same picture

### AC-07 (US-05) — domain invariant

**Given** a derived generation and its source generation
**When** the Owner deletes the source
**Then** the deletion goes ahead without asking about derived generations beyond the usual confirmation, the derived generation keeps all its images and input copies, and its lineage shows «source deleted» instead of a link

### AC-08 (US-01, US-03) — error

**Given** the Owner opened a re-run or reuse form
**When** the source generation was deleted (for example in another tab) before the Owner generates
**Then** the system sends nothing to the provider, tells the Owner the source generation no longer exists, and keeps the prompt and settings in the form so the Owner can attach images by hand

### AC-09 (US-03) — error

**Given** an output image that cannot be used as an input (larger than 10 MB or not a supported picture)
**When** the Owner chooses «Use as input» on it
**Then** the system refuses to attach it, says why in plain language, and sends nothing

### AC-10 (US-02) — cross-context

**Given** a generation whose provider is no longer configured or whose model the provider no longer offers
**When** the Owner chooses «Re-run»
**Then** the form keeps the prompt, parameters and input images, says that the original model or provider is not available, and lets the Owner pick another model or provider — nothing is sent until the Owner does

### AC-11 (US-03) — cross-context

**Given** the current provider offers no model that accepts input images
**When** the Owner chooses «Use as input»
**Then** the form keeps the image attached, says that no model of this provider takes input images, and the Owner can switch provider; nothing is sent until a suitable model is chosen

### AC-12 (US-01, US-03) — authorization

**Given** a page from another site is open in the Owner's browser
**When** it tries to start a re-run or reuse, or to read a generation's lineage
**Then** gen-img refuses: nothing is sent to a provider, no balance is spent and no data is handed to that page

### AC-13 (US-03) — authorization

**Given** a start request that refers to a stored image by its generation and position
**When** that reference does not match an image gen-img stored (an unknown generation, a position that does not exist, or anything that is not a stored generation image)
**Then** the system refuses the request without revealing whether any such file exists, and sends nothing

### AC-14 (US-01) — cross-context

**Given** a generation is already in progress
**When** the Owner opens a re-run or reuse form and tries to generate
**Then** the form shows that a generation is in progress and does not start a second one, exactly like a normal generation

### AC-15 (US-04) — domain invariant

**Given** a derived generation was itself re-run or reused
**When** the Owner opens any generation in that chain
**Then** each detail view shows only its own direct source and its own direct derived generations — one level each way

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Starting a generation from stored images (server work before the provider call) | ≤ 300 ms p95 for 8 stored input images of ≤ 10 MB each | integration test (serial NFR project) with a stubbed provider |
| Detail view with lineage | ≤ 150 ms p95 with 1 000 generations and 50 derived from the opened one | integration test (serial NFR project) over a seeded data dir |
| Derived list size | at most the 50 newest derived generations are listed, with the total count | integration test |
| Durability | 0 generations whose stored input copies are missing after a crash mid-save (same all-or-nothing guarantee as step 3) | integration test with a failing commit + restart |

## 6.1 Security / privacy

- **Data classification:** confidential — the Owner's prompts and images (unchanged from earlier steps).
- **Personal data touched:** none new.
- **AuthZ/AuthN impact:** no accounts; every new action sits behind the existing «own pages only» guard. New surface: a start request may refer to stored images by generation and position — references are resolved only against images gen-img recorded, never as file names or paths.
- **Abuse cases:**
  - A foreign page triggers a re-run to spend the balance: refused like any other request (AC-12).
  - A crafted reference tries to read an arbitrary file through «use as input»: only recorded generation images can be referenced; anything else is refused without revealing existence (AC-13).
  - A source deleted between opening the form and generating: refused cleanly, nothing sent (AC-08).
  - A re-run on another model silently sending unsupported parameters: removed and named before sending (AC-05).
  - Lineage keeping deleted content reachable: a deleted source leaves only «source deleted» — no images, prompt or file of it stay reachable (AC-07, curate-gallery invariant).
- **Security review:** Required — new way for a request to read stored files server-side.

## 7. Metrics / KPIs

- **Generations started via re-run or reuse** — baseline: 0 (not possible today), target: ≥ 30 % of new generations within 2 weeks of shipping (count of generations with a source / all new generations).
- **Re-uploads of gen-img's own outputs** — baseline: every refinement needs a manual download + upload, target: 0 within 2 weeks (owner self-report).
- **Unsupported parameters sent after a model switch** — baseline: n/a, target: 0 (provider refusals mentioning an unsupported parameter after a re-run, from stored failure notices).

## 8. Open questions

<!-- none — the curate-gallery lineage question is decided in §1 ¶4 -->
