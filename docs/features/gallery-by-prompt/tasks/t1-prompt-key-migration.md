---
id: T1
title: "Promote the prompt key migration"
layer: "migration"
deps: []
blocks: ["T2"]
acs: ["AC-05"]
files_hint: ["docs/features/gallery-by-prompt/migrations/01_add_generation_prompt_key.up.sql", "docs/features/gallery-by-prompt/migrations/01_add_generation_prompt_key.down.sql", "migrations/", "src/server/db/migrate.int.test.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T1 — Promote the prompt key migration

## Place in the sequence

- **Blocked by:** — · **Blocks:** T2 — Write the prompt key on save and backfill older generations on boot · **Wave:** 1.
- **Lane:** own lane (migrations serialized).

## Why (user story)

> **As an** Owner
> **I want** a view with one card per distinct prompt, showing its latest image, the prompt's beginning, its counts and its models
> **So that** I see which prompts I reused and what they produced
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task adds the column and index that name and find a prompt group.

## Inlined context

> A `prompt_key` column = the first 32 hex characters of SHA-256 over the exact prompt …; a migration adds the nullable column and an index `(prompt_key, id)`
>
> — `adr/0037, option 1, abridged` · full text: [adr/0037-key-each-prompt-by-a-hash-stored-with-the-generation-and-backfilled-on-boot.md](../adr/0037-key-each-prompt-by-a-hash-stored-with-the-generation-and-backfilled-on-boot.md)

> **Promote-time hint:** sequential 4-digit; the live tree ends at `0009_index_generations_by_model` → next ≈ `0010_add_generation_prompt_key`.
>
> — `_audit/data-model-2026-10-19.md, verbatim` · full text: [_audit/data-model-2026-10-19.md](../_audit/data-model-2026-10-19.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

| Column / index | Change |
|---|---|
| `generations.prompt_key` TEXT, nullable, CHECK length 32 | added |
| `generations_by_prompt (prompt_key, id)` | added |

Staged pair → `migrations/0010_add_generation_prompt_key.{up,down}.sql`.

— `data-model.md`, abridged · full text: [data-model.md](../data-model.md)

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-05 (US-01, US-02) — domain invariant

> **Given** two generations' prompts differ in anything — a space, a line break, letter case
> **When** the gallery groups by prompt
> **Then** they are two groups; generations with exactly the same prompt text are one group, whatever model, provider or parameters they used
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] promote as 0010
- [ ] migrate test: column + index, short key refused, plan uses the index, rollback drops both; roundtrip lists include 0010

## Edge cases

| Case | Behaviour |
|---|---|
| rollback | column and index gone, other columns intact |

## Definition of Done

- [ ] 0010 applies/reverts
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
