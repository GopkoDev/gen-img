---
id: T6
title: "Fill the generate panel from a re-run or reuse source"
layer: "ui"
deps: ["T5"]
blocks: ["T7"]
acs: ["AC-01", "AC-03", "AC-06", "AC-08", "AC-10", "AC-11"]
files_hint: ["src/web/features/generate/GeneratePanel.tsx", "src/web/features/generate/InputImages.tsx", "src/web/features/generate/DraftSource.test.tsx"]
owner: "dmytro.hopko"
estimate: "M"
context_budget: "M"
status: "todo"
step: ""
---

# T6 — Fill the generate panel from a re-run or reuse source

## Place in the sequence

- **Blocked by:** T5 — Expose stored-image inputs and lineage through the routes · **Blocks:** T7 — Keep supported parameters and name removed ones when the model changes.
- **Lane:** shares `GeneratePanel.tsx` with T7 — serialized.

## Why (user story)

> **As an** Owner
> **I want** to open a past generation and start it again with everything pre-filled
> **So that** I repeat a request without retyping or re-uploading
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task delivers: fill the generate panel from a re-run or reuse source.

## Inlined context

> navigate to `/?rerun=<id>` or `/?reuse=<id>&output=<n>`; the panel reads it on mount, loads the source, fills the draft, then replaces the address with `/`.
>
> — `adr/0019, option 1, verbatim` · full text: [ADR-0019](../adr/0019-carry-the-draft-source-in-the-home-address-and-apply-it-once.md)

> | re-run draft | … «Started from» line: «Re-run of <prompt excerpt>» … + «×» …; muted «Sends the same inputs again — results can differ.»; form fields filled; stored input images shown like attachments |
> | model not available | (AC-10) | «The original model <id> isn't available — choose another. …» |
> | source gone | (AC-08) | «The source generation no longer exists.» + «Remove the link» |
> | no model takes inputs | (AC-11) | «No <provider> model takes input images — switch provider.»; Generate disabled |
>
> — `screens.md §SCR-01, abridged` · full text: [screens.md](../screens.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [screens.md](../screens.md) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- `POST /generations` — `StartGenerationRequest` gains `source: {id, relation: rerun|reuse, output?}` and `inputs: [{stored: {generationId, kind: input|output, position}} | {upload: n}]` (≤ 8, ordered; absent → uploads in order). Errors: `400 VALIDATION_ERROR` with `details.fields.source` («The source generation no longer exists») / `details.fields["inputs.N"]` («Not an image stored by gen-img», or size/format reason) / `details.fields.inputs`; `409 GENERATION_IN_PROGRESS`; `403 FORBIDDEN`.

— `contracts/openapi.yaml, operationId startGeneration, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-01 — happy path

> **Given** a saved generation whose provider is configured and whose model is still offered
> **When** the Owner chooses «Re-run» on its detail view
> **Then** the generate form opens with the same provider, model, prompt, parameters and input images (in the same order) already filled in — replacing whatever draft the form held — says it is a re-run of that generation, and the Owner can generate without changing anything; the Owner may drop that «re-run of» link before generating, and then the new generation has no source
>
> — `spec.md §5, AC-01, verbatim` · full text: [spec.md](../spec.md)

### AC-03 — happy path

> **Given** a saved generation with one or more output images
> **When** the Owner chooses «Use as input» on one of its output images
> **Then** the generate form opens with exactly that image attached as the input image (replacing the previous draft's prompt, parameters and attachments), an empty prompt, and the currently chosen model kept if it accepts input images (otherwise the first model of the current provider that does); once generated, the new generation's detail view says «Made from output N of» with a link to the source
>
> — `spec.md §5, AC-03, verbatim` · full text: [spec.md](../spec.md)

### AC-06 — domain invariant

> **Given** the Owner re-runs a generation
> **When** the form or the result is shown
> **Then** the system describes it as sending the same inputs again and never claims the result will be the same picture
>
> — `spec.md §5, AC-06, verbatim` · full text: [spec.md](../spec.md)

### AC-08 — error

> **Given** the Owner opened a re-run or reuse form
> **When** the source generation was deleted (for example in another tab) before the Owner generates
> **Then** the system sends nothing to the provider, tells the Owner the source generation no longer exists, and keeps the prompt and settings in the form; the Owner can drop the link to the deleted source and attach images by hand. This holds even when nothing from the source's files is reused — a link is only recorded to a generation that exists when generating starts
>
> — `spec.md §5, AC-08, verbatim` · full text: [spec.md](../spec.md)

### AC-10 — cross-context

> **Given** a generation whose provider is no longer configured or whose model the provider no longer offers
> **When** the Owner chooses «Re-run»
> **Then** the form keeps the prompt, parameters and input images, says that the original model or provider is not available, and lets the Owner pick another model or provider — nothing is sent until the Owner does
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

### AC-11 — cross-context

> **Given** the current provider offers no model that accepts input images
> **When** the Owner chooses «Use as input»
> **Then** the form keeps the image attached, says that no model of this provider takes input images, and the Owner can switch provider; nothing is sent until a suitable model is chosen
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `InputImages.tsx`: `Attachment` = uploaded file or stored image (url, name, ref)
- [ ] `GeneratePanel.tsx`: on mount read `rerun` / `reuse` + `output` from `location.search`, load the source via `api.generation`, replace the draft, `history.replaceState` to `/`
- [ ] «Started from» line with remove; notices per SCR-01 states
- [ ] Submit builds `inputs` (stored refs + upload slots in order) and `source`
- [ ] Tests in `DraftSource.test.tsx`

## Edge cases

| Case | Behaviour |
|---|---|
| source 404 on load | «The source generation no longer exists.»; draft unchanged |
| current model lacks inputs on reuse | first input-capable model selected and named |
| none takes inputs | notice, Generate disabled |

## Definition of Done

- [ ] web tests (mocked api): ?rerun fills provider/model/prompt/params/stored inputs and shows «Re-run of» + «results can differ», then cleans the address; ?reuse attaches one output, empty prompt, input-capable model chosen; source gone / model unavailable / no input-capable model notices; removing the link drops `source` from the request
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
