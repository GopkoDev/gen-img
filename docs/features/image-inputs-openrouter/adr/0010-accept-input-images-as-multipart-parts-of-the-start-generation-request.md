---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "S"
ticket: "roadmap step 3"
---

# 0010 — Accept input images as multipart parts of the start-generation request

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

Input images (up to 8 × 10 MiB, spec AC-03/AC-04) must travel from the browser to the server with a start-generation request. Step 2's start request is a JSON body. Roadmap step 6 will later reuse stored images (outputs or earlier inputs) as inputs without uploading them again.

## Decision drivers

- Spec §6: local overhead ≤ 1 000 ms p95 for 4 × 10 MB inputs.
- Spec AC-06 / CONTEXT invariant: no input copy without a generation.
- Step 6 must be able to add «reference a stored image» without breaking this contract.

## Considered options

1. **Multipart start request** — `POST /api/generations` accepts `multipart/form-data` with a `request` JSON part (the existing body) and `inputs` file parts in attach order; plain JSON keeps working for text-only.
2. **Base64 inside the JSON body** — the browser reads files as data URLs and embeds them in the existing JSON.
3. **Separate upload first** — files go to an upload endpoint that returns ids; the start request references the ids.

## Decision outcome

**Chosen:** Option 1. Files stream as binary (no 33 % base64 inflation, no giant JSON parse), nothing is stored before the job validates, and the text-only contract is untouched. Option 2 inflates 80 MiB to ~107 MiB and parses it as one string. Option 3 creates stored files that may never belong to a generation (orphans to clean up), which the invariant forbids; step 6 can instead add a `request.inputRefs` field next to the file parts.

## Consequences

**Positive**
- One request, one validation point; text-only clients unchanged.
- No pre-uploaded orphan files.

**Negative**
- The route parses two body formats.
- Large bodies need an explicit body-size limit on that route.

**Neutral**
- Step 6 adds references to stored images as another field of the `request` part.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4
- Related ADR: [[0011-store-input-copies-in-a-separate-generation-inputs-table]]
