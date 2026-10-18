---
status: Living
updated_at: "2026-10-18"
---

# Domain Context — gen-img

## Glossary

- Cost status — whether a generation's price is `known` (an exact amount), `pending` (expected to arrive later) or `unavailable` (the provider gave none). NOT a zero price: an unknown cost is never shown or stored as free.
- Gallery — the owner's browsable list of every saved generation, newest first, with a detail view per generation. NOT a provider's playground history: the gallery lives only on the owner's machine.
- Generation — one request the owner sent to a provider together with everything it produced and cost: prompt, model, parameters, output images, cost, duration, raw request/response. NOT a single image: one generation can hold several output images.
- Image model — a provider-offered model that can produce images, identified by the provider's model id. NOT a text-only chat model.
- Input image — an image the Owner attaches to a generation request (img→img, img+text→img); gen-img keeps its own copy with the generation. NOT an output image: inputs go to the provider, outputs come back from it.
- Output image — an image file a provider returned for a generation, stored on the owner's machine. NOT an input image (an image the owner attaches to a prompt — roadmap step 3).
- Owner — the single person who runs gen-img on their own machine and holds the provider API keys. The only human role; there are no accounts, admins or guests.
- Provider — an external image-generation service gen-img calls with the owner's key (OpenRouter, Vercel AI Gateway). NOT a model: one provider offers many image models.

## Invariants

- A generation is saved only together with all of its output images and copies of all of its input images — never a record without its image files, never image files without a record.
- A provider API key never leaves the server process — it is never shown to the owner's browser, stored in a generation's raw request, or written to logs.
- The app is reachable only from the owner's own machine.

## Out of scope

- Other human roles (guests, admins, shared accounts) · the product is «me, one machine» (idea-brief §3).
