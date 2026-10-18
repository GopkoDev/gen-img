# Ukiyo

Local-first web app for one user on one machine: a Node server on `127.0.0.1` generates images via
OpenRouter and Vercel AI Gateway, stores every generation locally (image files + full metadata in
SQLite) and serves a React gallery. No auth, no sync, no multi-user.

Source of truth for architecture: `docs/architecture-map.md` + `docs/adr/`. Roadmap: `docs/roadmap.md`.
Feature work follows the SDD pipeline (`docs/features/<slug>/`).

## Stack

TypeScript 5 (strict) on Node 26 (`.nvmrc`) · pnpm · Hono + `@hono/node-server` · React 19 + Vite ·
Tailwind CSS v4 + shadcn/ui · TanStack Query · zod · SQLite via `better-sqlite3` (hand-written SQL) ·
Vitest · Biome.

## Commands

| Command | What |
|---|---|
| `pnpm dev` | server (`tsx watch`, :8787) + Vite (:5173, proxies `/api` → :8787) |
| `pnpm build` | `tsc --noEmit` + `vite build` → `dist/web/` |
| `pnpm start` | one process: API + built SPA on `127.0.0.1:8787` |
| `pnpm test` | Vitest — projects `unit`, `integration`, `web`, `nfr` (timing tests, run last and alone) |
| `pnpm typecheck` | `tsc --noEmit` (the "vet" gate) |
| `pnpm lint` / `pnpm format` | Biome check / Biome write |
| `pnpm db:migrate` / `pnpm db:rollback` | apply pending migrations / revert the latest one |

Local gate (there is no CI): `pnpm typecheck && pnpm lint && pnpm test`.

## Layout

- `src/server/app.ts` — `createApp(deps)`; mounts module routes under `/api`.
- `src/server/modules/<module>/` — `routes.ts` (+ `service.ts`, `repo.ts`, `domain.ts`), exporting
  `register<Module>Routes(app, deps)`. Precedent: `modules/system/`.
- `src/server/db/` — `client.ts` (open SQLite, WAL), `migrate.ts` (runner used on boot and by `scripts/migrate.ts`).
- `src/server/lib/` — `errors.ts` (`AppError` + handlers), `ids.ts` (ULID), `config.ts` (env via zod).
- `src/shared/` — zod schemas / DTO types shared by server and web.
- `src/web/` — SPA: `components/ui/` (shadcn), `features/<feature>/`, `lib/api.ts` (typed client).
- `migrations/` — paired `NNNN_snake_name.up.sql` / `.down.sql`.
- `tests/helpers/` (`createTestApp`), `tests/fixtures/` (recorded provider JSON).

## Conventions

- **Wiring:** dependencies (db, config, later file store / provider registry / clock) are passed into
  `createApp(deps)` explicitly — no global singletons. Tests build the app with fakes.
- **Errors:** throw `AppError(code, message, status, details?)`; the one `onError` renders
  `{ "error": { "code", "message", "details"? } }`. Provider failures → `PROVIDER_ERROR` with
  `details.provider` + `details.upstreamStatus`; validation → `VALIDATION_ERROR` (400).
- **IDs:** ULIDs from `newId()` — time-sortable, so "newest first" is `ORDER BY id DESC`.
- **Persistence:** hand-written SQL in a per-module `repo.ts` with prepared statements; parse every
  row through zod before it leaves the repo. Images never go in the DB — only relative paths under
  the data dir. Timestamps: ISO-8601 UTC text. Money: integer micro-USD (`cost_micros`) + status
  (`known | pending | unavailable`).
- **Migrations:** a new table/column = a new `migrations/NNNN_*.up.sql` + `.down.sql` pair (via
  `/sdd:data-model`). The server applies pending migrations on boot.
- **HTTP API:** JSON under `/api/*`, resource-oriented; request/response bodies defined once as zod
  schemas in `src/shared/`, used by both the route and `src/web/lib/api.ts`.
- **Providers:** a new provider / call path = a new `ImageProvider` adapter in
  `src/server/modules/providers/`; never branch on provider inside `generations`. Plain `fetch`, no vendor SDK.
- **Tests:** unit `*.test.ts` colocated; integration `*.int.test.ts` against a real SQLite file in a
  temp data dir via `createTestApp()` + `app.request()`; provider HTTP stubbed from `tests/fixtures/`;
  web `*.test.tsx` with Testing Library + jsdom.
- **UI:** Tailwind utilities + shadcn/ui primitives from `src/web/components/ui/` (add more with
  `pnpm dlx shadcn@latest add <name>` and check the `cn` import points at `@/lib/utils`); no second
  component library, no CSS-in-JS.

## Hard rules

- The server binds **`127.0.0.1` only** — never a network interface (it holds the API keys' spending power).
- API keys are **server-only**: read from `.env.local` (gitignored; see `.env.example`), validated in
  `src/server/lib/config.ts`, never sent to the browser.
- Data lives in `GEN_IMG_DATA_DIR` (default `./data`, gitignored).
