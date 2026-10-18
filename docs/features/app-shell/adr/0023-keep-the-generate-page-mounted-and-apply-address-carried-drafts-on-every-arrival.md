---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-18"
feature_size: "S"
ticket: "roadmap step 8"
---

# 0023 — Keep the Generate page mounted and apply address-carried drafts on every arrival

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** dmytro.hopko (Owner/Architect; answers delegated to Claude in the design pass)
- **Amends:** [ADR-0019](../../rerun-and-reuse/adr/0019-carry-the-draft-source-in-the-home-address-and-apply-it-once.md) — «the panel reads it on mount» becomes «on every arrival at Generate with a carried source».

## Context

The generate panel keeps its draft (prompt, model, parameters, attachments, draft source) in component state and polls the one server-side job (ADR-0005). When it shared the home page with the gallery, looking at the gallery never unmounted it. With sections, showing the Gallery would unmount the panel and drop the draft (spec AC-05), and nothing would poll the job, so a finished generation would not reach the gallery and the bar could not show «running» (AC-06).

## Decision drivers

- AC-05: draft survives Generate → Gallery → Generate.
- AC-06: running / failed state visible from every section, new item in the gallery without reload, no extra polling (spec §6).
- AC-07: re-run / use as input / «Write a prompt» still land on Generate, repeatedly in one visit.
- No global state library (CLAUDE.md); the panel stays the single owner of its draft (ADR-0019).

## Considered options

1. **Keep the Generate page mounted, hidden while another section shows** — a registry flag `keepMounted`; the panel keeps its state and its job polling; the bar reads the job from the shared query cache without fetching. Carried sources (`?rerun=`, `?reuse=&output=`, and a new `?focus=prompt`) are applied whenever the address on Generate carries one. The flag is taken from the address at once with a `replace` that notifies the router (so Back never re-applies it), and a source load applies only while its arrival is still current — a slower earlier load, or one that finishes after the Owner left Generate, is dropped.
2. **Lift the draft into a store** (context or module-level) and let the panel remount — the store outlives the page; job polling moves to the shell.
3. **Persist the draft in session storage** on every change and restore on mount.

## Decision outcome

**Chosen:** Option 1. It keeps every behaviour of steps 2–7 (the panel's own polling, its success → gallery refresh, its object URLs for attachments) with no change to the panel's state model; only the «read once on mount» becomes «read on arrival». Option 2 moves a large amount of panel state into a store and splits job ownership. Option 3 cannot hold attached files (`File` objects) and leaks stale drafts into later visits — the reason ADR-0019 avoided storage.

## Consequences

**Positive**
- Draft, attachments and in-flight UI state survive section switches by construction.
- One job poller (the panel); the bar's indicator is a cache reader, so no extra requests.

**Negative**
- The panel's reads (providers, model list, current job) run on every app load, also on a Gallery or detail deep link — the same requests the old home page always made; cached server-side for 10 minutes.
- A hidden page must not steal focus or announce itself: it is rendered with the `hidden` attribute, which also removes it from the accessibility tree.

**Neutral**
- `focus=prompt` joins the ADR-0019 flags: tried once the panel has settled, then dropped (also on leaving Generate).
- Unlike ADR-0019's «survives a reload until applied», a reload during the brief source load now loses the carried source; the Owner starts the re-run again.
- Revisiting a section reloads nothing: the gallery and detail queries never go stale on their own (each change invalidates them; window focus still refetches, for other tabs).

## Links

- Spec: [[../spec.md]]
- SAD: [[../sad.md]] §4, §8
- Related ADR: ADR-0005, ADR-0019, [ADR-0022](./0022-declare-sections-in-one-registry-over-the-hand-written-router.md)
