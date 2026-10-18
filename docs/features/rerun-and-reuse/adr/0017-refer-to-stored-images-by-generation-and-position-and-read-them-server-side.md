---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 6"
---

# 0017 — Refer to stored images by generation and position and read them server-side

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect; answers delegated to Claude in the design pass)

## Context

Re-run resends a generation's input images; «use as input» sends one of its outputs. Both images already live in the data dir. Today a start request carries input images only as uploaded multipart files (ADR-0010). Spec AC-13 requires that only images gen-img recorded can be referenced; AC-08 that a deleted source fails cleanly; the derived generation must keep its own copies (CONTEXT invariant).

## Decision drivers

- Spec AC-13 (no arbitrary reads, no existence leak), AC-08, AC-09.
- Spec §6: ≤ 300 ms p95 server work for 8 stored images of ≤ 10 MB.
- ADR-0006/0011: the new generation saves its own copies all-or-nothing.

## Considered options

1. **Stored references resolved server-side** — the request lists inputs in order as `{stored: {generationId, kind, position}}` or `{upload: n}`; the server looks each reference up in `generation_inputs` / `generation_images`, reads the recorded file, runs the same input checks as for uploads, then continues exactly like an upload (own copies staged in the save transaction).
2. **Browser fetches and re-uploads** — the panel downloads the stored image through the file route and sends it back as a multipart file; the server stays unchanged.
3. **Copy by path** — the request names the stored file's relative path; the server copies it.

## Decision outcome

**Chosen:** Option 1. It never moves bytes the server already has through the browser (option 2 doubles transfer and memory for 80 MB re-runs, and loses the knowledge that the image came from gen-img), and it keys references on recorded rows instead of paths (option 3 makes every request a path to validate — exactly the arbitrary-read surface AC-13 forbids). Uploads and references share one ordered list so mixed drafts keep their order.

## Consequences

**Positive**
- One validation path for all inputs (format, size, model limits); the save path is unchanged.
- References can't name anything that isn't a recorded image; misses collapse into one generic error.

**Negative**
- The start request schema grows (`inputs` list, `source`); the server must check upload slots are used exactly once.
- Reading recorded files happens before the job starts, so a large re-run holds up to 80 MB in memory (same bound as uploads).

**Neutral**
- Old clients that send uploads without `inputs` keep working (uploads in order).

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4, §8
- Related ADR: [ADR-0010](../../image-inputs-openrouter/adr/0010-accept-input-images-as-multipart-parts-of-the-start-generation-request.md), [ADR-0011](../../image-inputs-openrouter/adr/0011-store-input-copies-in-a-separate-generation-inputs-table.md), [ADR-0006](../../text-to-image-openrouter/adr/0006-commit-generations-atomically-via-staging-dir-and-boot-sweep.md)
