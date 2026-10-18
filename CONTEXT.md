---
status: Living
updated_at: "2026-10-18"
---

# Domain Context — gen-img

## Glossary

- Cost status — whether a generation's price is `known` (an exact amount), `pending` (expected to arrive later) or `unavailable` (the provider gave none). NOT a zero price: an unknown cost is never shown or stored as free.
- Comment — the Owner's own free-text note on a generation (one per generation, editable, may be empty). NOT the prompt: the prompt was sent to the provider, the comment never is.
- Cost lookup — gen-img asking a provider, some time after a generation, for the price it did not state in its answer; it ends with a known amount or «unavailable». NOT a price estimate made before generating (roadmap step 7).
- Deletion — the Owner removing a generation for good: its record, comment, tags, output images and input copies disappear together, with no undo. NOT hiding or archiving: nothing of a deleted generation stays on the machine.
- Derived generation — a generation made by re-running or reusing another one; it records its source generation and keeps its own copies of every input. NOT a variation the provider made: deriving is the Owner's action in gen-img.
- Gallery — the owner's browsable list of every saved generation, newest first, with a detail view per generation. NOT a provider's playground history: the gallery lives only on the owner's machine.
- Generation — one request the owner sent to a provider together with everything it produced and cost: prompt, model, parameters, output images, cost, duration, raw request/response. NOT a single image: one generation can hold several output images.
- Image model — a provider-offered model that can produce images, identified by the provider's model id. NOT a text-only chat model.
- Input image — an image the Owner attaches to a generation request (img→img, img+text→img); gen-img keeps its own copy with the generation. NOT an output image: inputs go to the provider, outputs come back from it.
- Lineage — the link from a derived generation to its source generation (re-run of / made from output N of), shown on both sides. NOT ownership: deleting the source never deletes or blocks its derived generations.
- Output image — an image file a provider returned for a generation, stored on the owner's machine. NOT an input image (an image the owner attaches to a prompt — roadmap step 3).
- Owner — the single person who runs gen-img on their own machine and holds the provider API keys. The only human role; there are no accounts, admins or guests.
- Price estimate — what gen-img expects a request to cost before it is sent, from the provider's published price (or, for per-token models, the Owner's own past known costs); always labelled as an estimate. NOT the generation's cost: the recorded cost after generating is the only source of truth, and the estimate is never stored.
- Provider — an external image-generation service gen-img calls with the owner's key (OpenRouter, Vercel AI Gateway). NOT a model: one provider offers many image models.
- Re-run — starting a new generation from an existing one with the same provider, model, prompt, parameters and input images pre-filled; the Owner may change anything before generating. NOT a promise of the same picture: re-running resends the same inputs, results can differ.
- Reuse (use as input) — attaching one of a generation's output images as an input image of the next generation in one action, without saving and re-uploading the file. NOT a re-run: only that image is carried over.
- Source generation — the generation a re-run or reuse started from (the parent in the lineage). NOT the provider's original request: it is a gen-img generation record.
- Tag — a short label the Owner attaches to a generation to group it with others (normalized: trimmed, lower-case; a generation holds each tag once). NOT a model or provider attribute: tags come only from the Owner.

## Invariants

- A derived generation never depends on its source's files: it is saved with its own copies, so deleting the source changes nothing about it except that its lineage shows the source as deleted.

- A generation is saved only together with all of its output images and copies of all of its input images — never a record without its image files, never image files without a record.
- A deletion is all-or-nothing too: a generation's record and all its files disappear together — never a record whose files are gone, never files of a deleted record that stay reachable.
- A provider API key never leaves the server process — it is never shown to the owner's browser, stored in a generation's raw request, or written to logs.
- The app is reachable only from the owner's own machine.

## Out of scope

- Other human roles (guests, admins, shared accounts) · the product is «me, one machine» (idea-brief §3).
