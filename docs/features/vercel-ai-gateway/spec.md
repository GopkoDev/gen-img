---
status: Draft
owner: "dmytro.hopko"
reviewers: ["Tech Lead", "Security Lead"]
updated_at: "2026-10-18"
feature_size: "M"
---

# Spec — vercel-ai-gateway

> **Glossary:** [CONTEXT](../../../CONTEXT.md)
> **Reference module / docs / channels used:** [`docs/idea-brief.md`](../../idea-brief.md) §5–§7; [`docs/roadmap.md`](../../roadmap.md) step 4 + open decisions D3–D5; the shipped [`text-to-image-openrouter`](../text-to-image-openrouter/spec.md) and [`image-inputs-openrouter`](../image-inputs-openrouter/spec.md) specs + SADs (reference modules); Vercel AI Gateway public docs (image generation via chat completions and images API, REST reference — accessed 2026-10-18) and its public model catalog (unauthenticated, 2026-10-18).

## 1. Context

The Owner uses two image providers, and the idea brief made both part of v1 (idea-brief §5, owner-required). Steps 2–3 shipped OpenRouter only, so every generation the Owner makes on the second provider still happens in its playground and is lost to the gallery — exactly the pain gen-img exists to remove (idea-brief §2).

There is no external trigger; this is the next step of the roadmap once the provider boundary has proven itself with one provider (roadmap step 4, wave 3). The OpenRouter adapter, the generation record, input images and the gallery are in place; the second provider must slot in without changing how a generation is run, saved or shown.

Committed approach: add Vercel AI Gateway as a second provider the Owner can pick in the generate panel. Behind the same provider boundary it covers the gateway's two ways of producing images — image-only models and multimodal language models — and image inputs where the model accepts them, so the Owner sees one experience whatever the call path. Because this provider reports a generation's price only some time after it finishes, a generation can be saved with its cost «pending» and gets its final amount (or «unavailable») later, on its own, without ever being shown as free. Unknowns that need a real account — price for the Owner's own provider keys, whether a seed is honoured, how input images reach multimodal language models (roadmap D3–D5) — get safe defaults that only offer what is documented, and stay open questions until the first real call.

- Traceability: gateway capabilities (two call paths, image editing with source images, asynchronous price lookup that may answer «not found yet» for a few seconds, price excluding requests made with the Owner's own provider keys, public catalog with model types and list prices) are source-verified in Vercel's public docs, 2026-10-18; whether the image-only answer carries a reference usable for the price lookup is not documented (→ §8).
- Decision override: no independent critic/devil's-advocate subagent could run in this session — the failure-mode and coherence passes were done in-thread and are recorded as such; the owner's independent review runs after ship.

## 2. Goals

- Generations made through the second provider land in the same gallery with the same metadata guarantees as the first — nothing generated through gen-img is lost, whichever provider made it.
- The Owner always knows what a generation cost or honestly sees that the price is still coming or was never reported — never a misleading zero.
- Adding the second provider leaves the generation flow, the gallery and the first provider's behaviour unchanged.

## 3. Non-goals

- Parameters the gateway does not document per model (aspect ratio, seed) — offered only after a real call confirms them (§8), so the Owner is never shown a control that silently does nothing.
- A price estimate before generating — roadmap step 7.
- Streaming partial images — the gateway's edit path returns the finished image only, and no AC needs previews.
- Routing one request to a fallback provider automatically — the Owner chooses the provider explicitly.
- Video, speech or other non-image models the gateway also lists — out of the product's scope (idea-brief §1).

## 4. User stories

### US-01: Choose the provider

**As an** Owner
**I want** to pick OpenRouter or Vercel AI Gateway in the generate panel and see that provider's image models
**So that** I can generate through either of my accounts from one place

### US-02: Generate through Vercel AI Gateway

**As an** Owner
**I want** to generate from a prompt with any Vercel image model — an image-only model or a multimodal language model — through the same form
**So that** I don't have to know how the gateway calls each kind of model

### US-03: Use input images with Vercel models

**As an** Owner
**I want** to attach input images when the chosen Vercel model accepts them
**So that** img→img and img+text→img work on both providers

### US-04: See the real cost when it arrives later

**As an** Owner
**I want** a generation whose price isn't known yet to show «pending» and update to the final amount (or «unavailable») by itself
**So that** I track spending accurately without refreshing or guessing

### US-05: Tell providers apart in the gallery

**As an** Owner
**I want** every generation to show which provider made it
**So that** I can compare results and costs across providers

### US-06: Keep the second key private

**As an** Owner
**I want** the Vercel key to get the same protection as the OpenRouter key
**So that** nobody can spend either balance through gen-img

## 5. Acceptance criteria

### AC-01 (US-01, US-02) — happy path

**Given** both providers are configured and the Owner selects Vercel AI Gateway in the generate panel
**When** the Owner picks an image-only model, enters a prompt and generates
**Then** the system shows «generating», then the output images, and the new generation appears at the top of the gallery labelled with Vercel AI Gateway

### AC-02 (US-02) — happy path

**Given** the Owner selected Vercel AI Gateway
**When** the Owner picks a multimodal language model that can produce images and generates from a prompt
**Then** the result is saved and shown exactly like an image-only model's result; any text the model returns alongside the images is kept in the stored provider answer, not shown as an image

### AC-03 (US-01) — happy path

**Given** the Owner opens the model picker with Vercel AI Gateway selected
**When** the list loads
**Then** it lists only the gateway models that can produce images (by name and model id), and switching provider switches the list; for each model the form offers the number of images and input images only where the model is known to accept them, and never a seed or aspect ratio control

### AC-04 (US-03) — happy path

**Given** the Owner selected a Vercel model that accepts input images
**When** the Owner attaches images, writes a prompt and generates
**Then** the generation is saved with copies of the input images, exactly like an OpenRouter generation with inputs

### AC-05 (US-04) — domain invariant

**Given** a Vercel generation succeeded but its answer did not state a price
**When** it is saved and the Owner opens it in the gallery or detail view
**Then** it appears immediately with cost status «pending» — never as zero — and, without the Owner reloading, changes to the final amount (status «known») once the provider reports it, or to «unavailable» if the provider still has not reported it 10 minutes after the generation

### AC-06 (US-04) — domain invariant

**Given** gen-img stops while some generations still have a pending cost
**When** it starts again
**Then** pending costs younger than 10 minutes keep being looked up, older ones get one last lookup and then become «unavailable»; no generation stays «pending» forever

### AC-07 (US-04) — error

**Given** the provider's price lookup fails or answers something unusable for a generation
**When** the lookup gives up
**Then** the generation's cost becomes «unavailable», the generation itself stays intact and visible, and the Owner is not shown an error for it

### AC-08 (US-02) — error

**Given** the Owner submits a valid Vercel request
**When** the gateway refuses or fails it (insufficient credits, moderation, unavailable model, timeout) or answers without a usable image
**Then** the system shows the provider's reason in plain language, keeps the prompt, settings and attachments, and saves nothing — as for OpenRouter

### AC-09 (US-02, US-03) — error

**Given** the Owner selected a Vercel model
**When** the Owner asks for more images than the model makes, or attaches input images to a model that does not accept them
**Then** the system does not send anything and tells the Owner which field must be fixed and how

### AC-10 (US-01) — cross-context

**Given** only one of the two providers is configured
**When** the Owner selects the unconfigured one
**Then** the panel explains how to configure it and offers no generation for it, while the configured provider and the gallery keep working

### AC-11 (US-01) — cross-context

**Given** a generation is in progress on one provider
**When** the Owner switches to the other provider and tries to generate
**Then** the panel still shows «in progress» and does not submit — one generation at a time across both providers, so one click never spends twice

### AC-12 (US-05) — happy path

**Given** the gallery holds generations from both providers
**When** the Owner browses it or opens a detail view
**Then** every tile and detail view names the provider that made the generation, and generations from both providers are ordered together newest first

### AC-13 (US-06) — authorization

**Given** the Vercel key is configured
**When** anyone inspects what the app shows in the browser — the panel, the gallery, a detail view including the raw request — or the stored data
**Then** the Vercel key appears nowhere, and price lookups are made only by gen-img itself, never by the browser

### AC-14 (US-06) — authorization

**Given** a page from another site is open in the Owner's browser
**When** it tries to start a Vercel generation
**Then** gen-img refuses as for OpenRouter: nothing is sent and no balance is spent

### AC-15 (US-01) — cross-context

**Given** Vercel AI Gateway has been added
**When** the Owner generates through OpenRouter, with or without input images
**Then** everything behaves exactly as before this feature: same parameters offered, same request sent, cost known from the answer, same gallery and detail view

## 6. Non-functional requirements

| Aspect | Target | Measurement |
|---|---|---|
| Pending cost resolution | ≥ 95 % of pending costs reach «known» or «unavailable» within 10 min 30 s of the generation | integration test with a fake clock + stubbed lookup; boot-resume test |
| Price lookups per generation | ≤ 8 lookups, first one ≥ 5 s after the answer, backoff doubling to at most 60 s | unit test over the lookup schedule |
| Pending cost visible in the UI | the detail view and gallery reflect a resolved cost within 15 s without a reload | web test with polling at ≤ 10 s while any visible cost is «pending» |
| Gallery first page (24 items), 1 000 mixed-provider generations | ≤ 300 ms p95 server time (unchanged from step 2) | NFR test over a seeded data dir |
| Provider request timeout | 180 s, then the failure path; nothing recorded (unchanged) | integration test with a hanging stub |
| Raw answer size | 0 bytes of embedded image payload (outputs and inputs) in the stored provider exchange, for every Vercel call path | integration test scans stored rows |

## 6.1 Security / privacy

- **Data classification:** confidential — the second provider key carries spending power; prompts and images stay the Owner's private work.
- **Personal data touched:** none new.
- **AuthZ/AuthN impact:** the Vercel key is server-only like the OpenRouter key; price lookups run server-side only; the existing local-only reachability and request guard cover every new surface.
- **Abuse cases:**
  - Key leak through the stored exchange or the price-lookup request: the key is never stored, logged or sent to the browser.
  - A foreign page triggering Vercel generations: refused by the same guard (AC-14).
  - A runaway lookup loop spending requests: lookups are bounded per generation (§6) and stop on «unavailable».
  - Double spend by switching providers mid-generation: one in-flight generation across both providers (AC-11).
- **Security review:** Required — second spending key and a new background process calling the provider.

## 7. Metrics / KPIs

- **Owner's image generations made through gen-img (both providers)** — baseline: OpenRouter only (Vercel 0 %), target: ≥ 80 % of the Owner's Vercel generations made in gen-img within 2 weeks (owner self-report).
- **Generations left «pending» longer than 11 minutes** — baseline: n/a, target: 0 over the first 2 weeks (query over the data dir).
- **Vercel generations ending «unavailable»** — baseline: unknown, target: measured over the first 2 weeks to decide D3/§8 follow-ups (query over the data dir).

## 8. Open questions

- [ ] D3 — How is the cost obtained for requests made with the Owner's own provider keys through the gateway, where the gateway's own price excludes the request cost? Default now: use the gateway's reported market price for such requests when it is non-zero, else «unavailable». — owner: dmytro.hopko, due: first real Vercel call
- [ ] D4 — Does the gateway honour a seed for image models? Default now: no seed control for Vercel models (§3), the seed is never sent. — owner: dmytro.hopko, due: first real Vercel call
- [ ] D5 — How do input images reach multimodal language models? Default now: every Vercel generation with input images goes through the gateway's documented image-editing path (which lists multimodal image models too); without inputs, multimodal language models use the chat path. — owner: dmytro.hopko, due: first real Vercel call
- [ ] D6 — Does the image-only answer carry a reference usable for the later price lookup? Default now: read it where documented or observed; if absent, the cost is «unavailable» (never pending forever). — owner: dmytro.hopko, due: first real Vercel call
