# gen-img

<!-- cover image: docs/assets/cover.png -->

Local image-generation workbench for OpenRouter and Vercel AI Gateway, with a gallery that keeps every generation on your machine.

---

## Description (ASD-STE100)

> This section is written in ASD-STE100 Simplified Technical English.

gen-img is a web application for one person on one computer.

The application makes images from a text prompt. It can also make images from a text prompt and one or more input images.

The application sends each request to an image provider. You can use two providers: OpenRouter and Vercel AI Gateway.

The application keeps each result on your computer. It keeps these items:

- The output images.
- Copies of the input images.
- The prompt, the provider, the model and the parameters.
- The cost and the cost status.
- The time of the request and the duration.
- The request and the response, without the API key and without the image data.

The gallery shows all the results. The newest result is first.

You can do these tasks in the gallery:

- Open a result and read all its data.
- Write a comment.
- Add a tag or remove a tag.
- Delete a result. The application deletes the record and all its image files together.
- Run a result again with the same inputs. You can change the model or the provider before you start.
- Use an output image as the input image for a new request. The application records the link between the two results.

Before you start a request, the application shows the price of the model and an estimate of the cost. The estimate is not the cost. The application records the real cost after the provider sends the result.

If the provider does not give a price, the application shows "unknown". It does not show zero.

### Safety

The server accepts connections only from your computer (127.0.0.1).

The API keys stay on the server. The application does not send the keys to the browser. It does not write the keys in the database or in the log.

The server does not accept requests from web pages of other sites.

### Procedure: start the application

1. Install Node.js 26 and pnpm.
2. Install the dependencies: `pnpm install`.
3. Copy the file `.env.example` to `.env.local`.
4. Write your API key in `.env.local`. You must have a key for one provider or more.
5. Start the application: `pnpm dev`.
6. Open `http://127.0.0.1:5173` in your browser.

---

## Overview

**gen-img** is a local-first web app: a Node server bound to `127.0.0.1` calls image providers with your keys, stores every generation (image files + full metadata in SQLite) and serves a React gallery. No accounts, no cloud, no sync — your prompts and images never leave your machine except as the request to the provider you chose.

### Features

- **Text → image** and **image(s) + text → image** through **OpenRouter** (Image API) and **Vercel AI Gateway** (images, edits and multimodal chat models).
- **Everything is kept**: output images, copies of inputs, prompt, model, requested vs received parameters, cost with status (`known` / `pending` / `unavailable`), duration, and the raw request/response — keys stripped, image payloads replaced by file references.
- **Gallery** newest-first with a detail page per generation.
- **Curate**: one editable comment per generation, normalized tags, delete (all-or-nothing, crash-safe).
- **Re-run & reuse**: re-run with the same inputs (same or another model/provider) via a pre-filled form, or use any output as the next input in one click; parent → child lineage on both sides.
- **Price preview**: the selected model's published price and a labelled estimate before you generate; Vercel costs that arrive later are looked up in the background.
- **Safe by default**: loopback-only server, keys server-side only, a request guard that refuses foreign origins and DNS rebinding.

### Stack

TypeScript 5 (strict) · Node 26 · Hono · React 19 + Vite · Tailwind CSS v4 + shadcn/ui · TanStack Query · zod · SQLite (`better-sqlite3`, hand-written SQL) · Vitest · Biome. Provider calls use plain `fetch` — no vendor SDKs.

### Quick start

```sh
nvm use                          # Node 26 (see .nvmrc)
pnpm install
cp .env.example .env.local       # add OPENROUTER_API_KEY and/or AI_GATEWAY_API_KEY
pnpm dev                         # http://127.0.0.1:5173
```

Production-style single process:

```sh
pnpm build && pnpm start         # API + built SPA on http://127.0.0.1:8787
```

### Configuration

All configuration lives in `.env.local` (gitignored) and is read only by the server.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `OPENROUTER_API_KEY` | one of the two | — | OpenRouter key |
| `AI_GATEWAY_API_KEY` | one of the two | — | Vercel AI Gateway key |
| `GEN_IMG_DATA_DIR` | no | `./data` | SQLite database and image files |
| `PORT` | no | `8787` | API server port (always bound to `127.0.0.1`) |

A provider without a key is shown as "not configured"; the gallery keeps working.

### Commands

| Command | What it does |
|---|---|
| `pnpm dev` | API server (`tsx watch`, :8787) + Vite (:5173, proxies `/api`) |
| `pnpm build` | typecheck + production build into `dist/web/` |
| `pnpm start` | one process: API + built SPA on :8787 |
| `pnpm test` | Vitest — `unit`, `integration`, `web`, `nfr` (timing tests, run last) |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | `tsc --noEmit` / Biome check / Biome write |
| `pnpm db:migrate` / `pnpm db:rollback` | apply pending migrations / revert the latest (the server also migrates on start) |

Local quality gate (there is no CI): `pnpm typecheck && pnpm lint && pnpm test`.

### Project layout

```
src/server/        Hono app, modules (generations, providers, storage, system), SQLite, migrations runner
src/shared/        zod schemas shared by server and web
src/web/           React SPA — generate panel, gallery, detail page
migrations/        paired NNNN_name.up.sql / .down.sql
tests/             helpers + recorded provider fixtures
docs/              idea brief, roadmap, architecture map, ADRs, and one folder per feature
```

### How it was built

The project was built feature by feature with a spec-driven pipeline: idea brief → roadmap → per feature `spec → clarify → ux-flows → design (SAD + ADRs) → sequences → data model → API contract → screens → tasks → test plan → TDD implementation → independent review → ship`. Every artifact is in [`docs/`](docs/) — start with [`docs/roadmap.md`](docs/roadmap.md) and [`docs/architecture-map.md`](docs/architecture-map.md); each feature has its own folder under [`docs/features/`](docs/features/).

### Status and known gaps

- Live calls through **Vercel AI Gateway** have not been verified yet; open questions D3–D6 (BYOK cost, `seed`, input images on the chat path, cost reference) are tracked in the roadmap and the feature spec.
- Gallery search and filters are intentionally out of scope for v1.
- Desktop-first UI; usable on tablets, not designed for phones.
