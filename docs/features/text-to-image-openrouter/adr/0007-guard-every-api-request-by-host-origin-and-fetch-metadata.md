---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "M"
ticket: "roadmap step 2"
---

# 0007 — Guard every API request by Host, Origin and Fetch Metadata

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The server binds `127.0.0.1`, which stops other devices (AC-11) but not a foreign web page in the Owner's own browser: it can send cross-site requests to `http://127.0.0.1:8787` (CSRF, `<img>` embeds) or use DNS rebinding to make its own hostname resolve to 127.0.0.1. Spec AC-19 requires that such pages can neither spend the balance nor read the gallery or images.

## Decision drivers

- Spec AC-19, §6.1 abuse cases (foreign page, DNS rebinding).
- No auth by design (single owner) — the guard must work without credentials.
- Dev mode: Vite on `localhost:5173` proxies `/api` to `:8787`.

## Considered options

1. **Request guard middleware on `/api/*`** — refuse unless `Host` is `127.0.0.1` or `localhost` on an allowed port (the configured `PORT`, plus the dev UI port 5173); if `Origin` is present it must be one of those exact origins (`http://127.0.0.1:<port>` / `http://localhost:<port>`); if `Sec-Fetch-Site` is present it must be `same-origin` or `none`. Restricting ports keeps other local apps (e.g. `localhost:3000`) out even on browsers without Fetch Metadata.
2. **CSRF token** — the SPA fetches a token and sends it on every state-changing request.
3. **Origin check on generate only** — refuse a foreign `Origin` on the start-generation request.

## Decision outcome

**Chosen:** Option 1. The Host check defeats DNS rebinding, and Origin + Fetch Metadata stop cross-site writes and reads including image embeds, all statelessly. Option 2 does nothing against DNS rebinding and against reads. Option 3 leaves the gallery and images readable (AC-19 covers reads too).

## Consequences

**Positive**
- One middleware covers every current and future `/api` route, including the file route.
- No client changes — browsers send these headers automatically.

**Negative**
- Non-browser tools (curl) must send a local Host (default) and no foreign Origin — fine for a local tool.
- Relies on browsers sending `Sec-Fetch-Site` (all current engines do); older browsers fall back to Host + Origin.

**Neutral**
- If the app is ever reached through another local hostname, that name must be added to the allowlist.

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §8
- Related ADR: —
