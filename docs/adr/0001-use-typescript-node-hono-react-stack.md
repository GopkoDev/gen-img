---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: ""
ticket: ""
---

# 0001 — Use TypeScript on Node 26 with Hono (server) and React + Vite (UI)

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (owner), survey foundation session

## Context

gen-img is a greenfield, single-user, local-first web app: a localhost server calls OpenRouter and
Vercel AI Gateway and a browser UI shows a gallery of stored generations (idea brief §1, §5, §7). The
language/framework choice shapes every later feature and changing it is effectively a rewrite, so it
is fixed now, before scaffolding. A native desktop wrapper is explicitly deferred (brief §5) but
should stay possible.

## Decision drivers

- One person builds and maintains it as a mini project — minimise the number of languages and tools.
- Server and UI share request/response shapes (generation metadata, provider params) — one type system avoids drift.
- Must run locally with no extra infrastructure; owner asked for the latest stable Node.
- Keep a later desktop wrapper (Tauri/Electron) cheap — the UI should be a plain web SPA.
- Provider responses must be persisted raw → full control over HTTP calls.

## Considered options

1. **TypeScript end-to-end: Node 26 + Hono server, React 19 + Vite SPA, zod shared schemas** — one language, small server framework, SPA served by the same process.
2. **Next.js full-stack app** — one framework for UI + API routes; heavier runtime and conventions than a localhost tool needs, and server/client boundaries add complexity.
3. **Python (FastAPI) server + separate TS/React UI** — strong for scripting, but two languages, two toolchains, and duplicated DTO types.

## Decision outcome

**Chosen:** Option 1. It satisfies "one language, shared types" and "no extra infrastructure" with
the smallest moving parts: Hono is a thin, fast HTTP layer, Vite gives a plain SPA that any desktop
shell can host later, and zod schemas in `src/shared/` are the single contract for both sides.
Node 26 is the current stable release line (v26.12.0, 2026-10-14), per owner request.

## Consequences

**Positive**
- One toolchain (pnpm, tsc, Biome, Vitest) for everything; types flow from `src/shared/` to server and UI.
- `pnpm start` runs a single process serving API + built SPA — trivial to wrap in a desktop shell later.
- Plain `fetch` to providers keeps raw request/response available for metadata.

**Negative**
- Node 26 is only just entering LTS; some native modules (notably `better-sqlite3`) may lag with prebuilt binaries and fall back to a local compile.
- Hono + React means wiring two dev servers (`tsx watch` + Vite with `/api` proxy) during development.

**Neutral**
- shadcn/ui + Tailwind v4 are the UI building blocks; the detailed design canon is fixed later by `/sdd:design-system`.
- No CI (owner decision) — the same commands run locally as the quality gate.

## Links

- Idea brief: [[../idea-brief.md]] §1, §5, §7
- Architecture map: [[../architecture-map.md]] §Stack
- Related ADR: [[0002-organize-as-modular-monolith-with-provider-port]], [[0003-store-metadata-in-sqlite-and-images-on-disk]]
