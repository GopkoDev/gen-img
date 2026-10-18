---
id: T8
title: "Guard every API request by Host, Origin and Fetch Metadata"
layer: "wiring"
deps: []
blocks: ["T10"]
acs: ["AC-11", "AC-19"]
files_hint: ["src/server/lib/request-guard.ts", "src/server/lib/request-guard.test.ts", "src/server/app.ts", "src/server/app.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

# T8 — Guard every API request by Host, Origin and Fetch Metadata

## Place in the sequence

- **Blocked by:** — · **Blocks:** T10 — Expose generations, job and file routes and wire the app.
- **Lane:** shares `src/server/app.ts` with T10 — serialized.

## Why (user story)

> **As an** Owner
> **I want** my provider key to stay on my machine's server side and the app to be unreachable from other devices
> **So that** nobody can spend my provider balance through gen-img
>
> — `spec.md §4, US-06, verbatim` · full text: [spec.md](../spec.md)

This task delivers: guard every API request by Host, Origin and Fetch Metadata.

## Inlined context

> refuse unless `Host` is `127.0.0.1` or `localhost` on an allowed port (the configured `PORT`, plus the dev UI port 5173); if `Origin` is present it must be one of those exact origins …; if `Sec-Fetch-Site` is present it must be `same-origin` or `none`.
>
> — `adr/0007, option 1, abridged` · full text: [ADR-0007](../adr/0007-guard-every-api-request-by-host-origin-and-fetch-metadata.md)

> **Hard rule:** The server binds **`127.0.0.1` only** — never a network interface (it holds the API keys' spending power).
>
> — `CLAUDE.md §Hard rules, verbatim` · full text: [CLAUDE.md](../../../../CLAUDE.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

No DB changes.

## API contract

- All operations: `403 FORBIDDEN` from the guard.

— `contracts/openapi.yaml, info.description + Forbidden, abridged` · full text: [openapi.yaml](../contracts/openapi.yaml)

## Acceptance criteria

### AC-11 — authorization

> **Given** gen-img is running on the Owner's machine
> **When** another device on the same network tries to open the app or ask it to generate
> **Then** it cannot reach the app at all, so nobody but the Owner can spend the provider balance or see the gallery
>
> — `spec.md §5, AC-11, verbatim` · full text: [spec.md](../spec.md)

### AC-19 — authorization

> **Given** a page from another site is open in the Owner's browser while gen-img runs
> **When** that page tries to start a generation, read the gallery or a generation, or load a stored image through gen-img
> **Then** gen-img refuses: nothing is sent to the provider, no balance is spent and no gallery data or image is handed to that page — gen-img only answers its own pages, opened by the address of the Owner's machine
>
> — `spec.md §5, AC-19, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `requestGuard(allowedPorts: number[])` Hono middleware in `request-guard.ts`: Host must be `127.0.0.1|localhost` with a port in allowedPorts; Origin (if present) must be `http://127.0.0.1:<p>` or `http://localhost:<p>` for an allowed port; `Sec-Fetch-Site` (if present) ∈ {same-origin, none}; else `AppError('FORBIDDEN', 'Request refused: gen-img only answers its own pages', 403)`
- [ ] Mount on the `/api` sub-app in `createApp` with ports `[config.port, 5173]`; keep `127.0.0.1` bind in `src/server/index.ts` (AC-11 — assert in a test that HOST is loopback)

## Edge cases

| Case | Behaviour |
|---|---|
| Host evil.example:8787 (DNS rebinding) | refused |
| Origin http://localhost:3000 | refused |
| Sec-Fetch-Site same-site | refused |
| no Origin, no Sec-Fetch-Site (curl) | allowed |

## Definition of Done

- [ ] unit tests over the header matrix + an integration test that a cross-site request to /api/health is refused with FORBIDDEN and a same-origin one passes
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean (`pnpm lint`, `pnpm typecheck`)
