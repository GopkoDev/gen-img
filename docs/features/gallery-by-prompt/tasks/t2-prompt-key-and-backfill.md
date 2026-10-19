---
id: T2
title: "Write the prompt key on save and backfill older generations on boot"
layer: "infra"
deps: ["T1"]
blocks: ["T3"]
acs: ["AC-05", "AC-10"]
files_hint: ["src/server/modules/generations/promptKey.ts", "src/server/modules/generations/promptKey.test.ts", "src/server/modules/generations/repo.ts", "src/server/modules/generations/service.ts", "src/server/app.ts", "src/server/modules/generations/prompt-key.int.test.ts", "tests/helpers/generations.ts"]
owner: "dmytro.hopko"
estimate: "S"
context_budget: "S"
status: "todo"
step: ""
---

<!-- Self-contained task: work from what is inlined here; if a slice is insufficient, ambiguous, or
contradicts the code, open the named file and follow it. Do not invent the missing part. -->

# T2 — Write the prompt key on save and backfill older generations on boot

## Place in the sequence

- **Blocked by:** T1 — Promote the prompt key migration · **Blocks:** T3 — Read prompt groups, one group and a prompt's pages · **Wave:** 2.
- **Lane:** own lane.

## Why (user story)

> **As an** Owner
> **I want** a view with one card per distinct prompt, showing its latest image, the prompt's beginning, its counts and its models
> **So that** I see which prompts I reused and what they produced
>
> — `spec.md §4, US-01, verbatim` · full text: [spec.md](../spec.md)

This task makes every generation, old or new, carry its prompt's key.

## Inlined context

> `createHash("sha256").update(prompt, "utf8").digest("hex").slice(0, 32)`; no trim, no case fold, no Unicode normalisation
>
> — `sad.md §8, Prompt key, verbatim` · full text: [sad.md](../sad.md)

> on boot after `migrateUp`, `SELECT id, prompt … WHERE prompt_key IS NULL` → update in one transaction; idempotent
>
> — `sad.md §8, Backfill, verbatim` · full text: [sad.md](../sad.md)

> Existing generations grouped | every generation stored before the feature has its prompt key after the first start, in ≤ 2 s for 1 000 generations | integration test over a seeded data dir
>
> — `spec.md §6, row 3, verbatim` · full text: [spec.md](../spec.md)

**Fallback:** insufficient or contradicted by the code → read the named file in full
([spec.md](../spec.md) · [sad.md](../sad.md) · [data-model.md](../data-model.md) ·
[openapi.yaml](../contracts/openapi.yaml) · [adr/](../adr/)) and follow it. Do not guess.

## Data delta

Writes `generations.prompt_key` (T1).

## API contract

Internal — no API surface.

## Acceptance criteria

### AC-05 (US-01, US-02) — domain invariant

> **Given** two generations' prompts differ in anything — a space, a line break, letter case
> **When** the gallery groups by prompt
> **Then** they are two groups; generations with exactly the same prompt text are one group, whatever model, provider or parameters they used
>
> — `spec.md §5, AC-05, verbatim` · full text: [spec.md](../spec.md)
### AC-10 (US-03) — cross-context

> **Given** the Owner has generations made before this feature existed
> **When** the Owner opens «By prompt» for the first time
> **Then** those generations are grouped like new ones — with single-use prompts included, no generation is missing from the prompt groups
>
> — `spec.md §5, AC-10, verbatim` · full text: [spec.md](../spec.md)

## Checklist

- [ ] `promptKey(text)` + unit test against an independent hash (incl. trailing newline, case, NFC vs NFD differ)
- [ ] repo insert writes prompt_key
- [ ] `backfillPromptKeys()` + call on boot in createApp beside sweepOnBoot
- [ ] `clearPromptKey(db, id)` test helper
- [ ] integration test: 1 000 rows with NULL keys → all keyed ≤ 2 s; idempotent second run

## Edge cases

| Case | Behaviour |
|---|---|
| prompt differs only by a trailing newline | different key |
| second boot | no updates |

## Definition of Done

- [ ] unit + integration tests pass
- [ ] every Hard Rule inlined above still holds
- [ ] lint + vet clean
