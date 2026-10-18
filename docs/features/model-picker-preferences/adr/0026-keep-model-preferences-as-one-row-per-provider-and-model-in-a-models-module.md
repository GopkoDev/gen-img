---
status: Accepted
owner: "dmytro.hopko"
reviewers: []
updated_at: "2026-10-19"
feature_size: "S"
ticket: "roadmap step 9"
---

# 0026 — Keep model preferences as one row per provider and model in a models module

- **Status:** Accepted — amended by [ADR-0029](../../models-page/adr/0029-turn-preference-flags-off-without-checking-the-provider-catalog.md) (2026-10-19): the catalog check applies only to writes that turn a flag on
- **Date:** 2026-10-19
- **Deciders:** dmytro.hopko (Owner/Architect), Claude (design pass, answers delegated by the Owner)

## Context

The picker needs the Owner's favorites now and hidden models for step 10's Models page (spec §1, US-04). Preferences must survive restarts and clearing the browser (AC-03), be per provider (AC-07), be refused for models the provider doesn't offer (AC-06), and outlive a model's temporary disappearance from the catalog (AC-08). Nothing in the repo stores per-model data yet.

## Decision drivers

- Spec AC-03 / §6: 100% of stored preferences survive a restart — browser storage is out.
- ADR-0003: metadata lives in SQLite under the data dir; CLAUDE.md: hand-written SQL per module repo.
- Roadmap wave 7/8: step 10 builds `src/server/modules/models/` on the same store.
- Spec §6: saving a ★ ≤ 50 ms p95; reading for 100 models ≤ 100 ms p95.

## Considered options

1. **A `model_preferences` table keyed by (provider, model) with `favorite` and `hidden` flags, owned by a new `models` module** — writes checked against the provider's cached catalog; a write changes only the flags it names and keeps the other stored one; a row whose resulting flags are both off is deleted.
2. **Two tables (`favorite_models`, `hidden_models`) of plain (provider, model) rows** — one table per flag.

## Decision outcome

**Chosen:** Option 1. One row per provider + model holds the whole invariant «one set of preferences per provider and model» (AC-07) as a primary key, and step 10 adds no schema. Option 2 doubles every read for step 10's table and splits one concept. (A JSON file in the data dir is not weighed: ADR-0003 already keeps metadata in SQLite.)

## Consequences

**Positive**
- One query per provider returns every preference; the picker joins it with the live catalog in the browser, so retired models' rows stay and return with their model (AC-08).
- Toggling off both flags deletes the row — toggling twice ends where it started, and the table only holds real choices.

**Negative**
- A write needs the provider's catalog (cached 10 min) to refuse unknown models; with the catalog down, writes are refused («couldn't check the model») rather than stored unchecked. *(Since ADR-0029: only writes that turn a flag on.)*
- Rows for models retired for good stay until step 10 offers a way to see them.

**Neutral**
- New module `src/server/modules/models/` (repo + routes) — the providers module stays the owner of catalogs and prices.

## Links

- Spec: [[../spec.md]] AC-03, AC-06, AC-07, AC-08
- SAD: [[../sad.md]] §4, §5, §8
- Related ADR: [ADR-0003](../../../adr/0003-store-metadata-in-sqlite-and-images-on-disk.md)
